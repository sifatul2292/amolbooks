// Super Admin can change the password of an admin of every role, through the same
// request the compiled admin edit form sends (whole form incl. role + newPassword).
// Real controller, guards, validation and service; throwaway local Mongo database.
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const deps = path.resolve(__dirname, '../api/node_modules');
require(deps + '/reflect-metadata');
const mongoose = require(deps + '/mongoose');
const { Module } = require(deps + '/@nestjs/common');
const { NestFactory } = require(deps + '/@nestjs/core');
const { PassportModule } = require(deps + '/@nestjs/passport');
const jwt = require(deps + '/jsonwebtoken');
const bcrypt = require(deps + '/bcrypt');
const { AdminController } = require('../api/dist/pages/admin/admin.controller');
const { AdminService } = require('../api/dist/pages/admin/admin.service');
const { JwtAdminStrategy } = require('../api/dist/pages/admin/jwt-admin.strategy');
const { AdminRoles } = require('../api/dist/enum/admin-roles.enum');
const { AdminSchema } = require('../api/dist/schema/admin.schema');

const uri = 'mongodb://127.0.0.1:27017/amol_admin_password_test_' + crypto.randomBytes(6).toString('hex');
const secret = 'isolated-admin-password-check-secret';

async function main() {
  const connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 3000 }).asPromise();
  const Admins = connection.model('Admin', AdminSchema);
  await Admins.init();
  const service = new AdminService(Admins, null, null, { getDateString: () => '2026-11-01' });
  class FixtureModule {}
  Module({
    imports: [PassportModule],
    controllers: [AdminController],
    providers: [
      { provide: AdminService, useValue: service },
      { provide: JwtAdminStrategy, useValue: new JwtAdminStrategy({ get: () => secret }) },
    ],
  })(FixtureModule);
  const app = await NestFactory.create(FixtureModule, { logger: false });
  try {
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    const url = await app.getUrl();
    const token = (role, permissions = ['create', 'edit', 'delete', 'get']) =>
      jwt.sign({ _id: new mongoose.Types.ObjectId().toString(), username: 'fixtureowner', role, permissions }, secret, { expiresIn: '5m' });
    const put = async (id, body, auth = token(AdminRoles.SUPER_ADMIN)) => {
      const response = await fetch(url + '/api/admin/update-admin/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', administrator: auth },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    };

    for (const role of Object.values(AdminRoles)) {
      const username = ('pw' + role).toLowerCase().replace(/[^a-z0-9]/g, '');
      const admin = await Admins.create({ name: 'Fixture ' + role, username, password: await bcrypt.hash('start123', 4), role, permissions: ['get'], hasAccess: true, readOnly: false, phoneNo: '01700000000', gender: 'male' });
      // Exactly what the compiled edit form submits (password removed, newPassword added).
      const form = { name: admin.name, email: null, username, phoneNo: '01700000000', gender: 'male', role, permissions: ['get'], hasAccess: true, newPassword: 'changed123' };
      const result = await put(admin._id, form);
      assert.equal(result.status, 200, role + ': ' + JSON.stringify(result.body));
      const stored = await Admins.findById(admin._id).select('password role').lean();
      assert.equal(await bcrypt.compare('changed123', stored.password), true, role + ' password changed');
      assert.equal(stored.role, role, role + ' role kept');
      const unchanged = await put(admin._id, { ...form, newPassword: null, name: 'Renamed ' + role });
      assert.equal(unchanged.status, 200, role + ' edit without a new password');
      assert.equal(await bcrypt.compare('changed123', (await Admins.findById(admin._id).select('password').lean()).password), true, role + ' password kept when left empty');
    }
    const target = await Admins.findOne({ role: AdminRoles.SALESMAN });
    assert.equal((await put(target._id, { role: 'owner', newPassword: 'changed456' })).status, 400, 'Unknown roles are still rejected');
    assert.equal((await put(target._id, { newPassword: 'abc' })).status, 400, 'Short passwords are still rejected');
    for (const role of [AdminRoles.ADMIN, AdminRoles.SALESMAN, AdminRoles.EDITOR])
      assert.equal((await put(target._id, { newPassword: 'changed456' }, token(role))).status, 401, role + ' cannot change other accounts');
    assert.equal((await put(target._id, { newPassword: 'changed456' }, token(AdminRoles.SUPER_ADMIN, ['get']))).status, 401, 'Super Admin needs the Edit permission');
    assert.equal(await bcrypt.compare('changed123', (await Admins.findById(target._id).select('password').lean()).password), true);
    console.log('Admin password change: every role (' + Object.values(AdminRoles).join(', ') + ') via the edit form request, empty password kept, invalid role/short password/unauthorised callers rejected');
  } finally {
    await app.close();
    await connection.dropDatabase();
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
