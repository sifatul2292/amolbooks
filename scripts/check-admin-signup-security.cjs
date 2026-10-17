const assert = require('node:assert/strict');
const path = require('node:path');
const deps = path.resolve(__dirname, '../api/node_modules');
require(deps + '/reflect-metadata');
const { Module } = require(deps + '/@nestjs/common');
const { NestFactory } = require(deps + '/@nestjs/core');
const { PassportModule } = require(deps + '/@nestjs/passport');
const jwt = require(deps + '/jsonwebtoken');
const bcrypt = require(deps + '/bcrypt');
const { AdminController } = require('../api/dist/pages/admin/admin.controller');
const { AdminService } = require('../api/dist/pages/admin/admin.service');
const { JwtAdminStrategy } = require('../api/dist/pages/admin/jwt-admin.strategy');
const { AdminRoles } = require('../api/dist/enum/admin-roles.enum');

async function main() {
  const saved = [];
  class FakeAdmin {
    constructor(data) { Object.assign(this, data); }
    async save() { saved.push(this); return { ...this, _id: 'fixture-admin' }; }
  }
  const service = new AdminService(FakeAdmin, null, null, {
    getDateString: () => '2026-10-17',
  });
  const secret = 'isolated-admin-signup-regression-secret';
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
    const payload = {
      name: 'Fixture admin', username: 'fixtureadmin', password: 'fixture-password',
      role: AdminRoles.SUPER_ADMIN, permissions: ['create'],
      email: 'fixture@example.com', phoneNo: '01700000000', hasAccess: false,
      _id: 'attacker-id', readOnly: true, registrationAt: 'attacker-date',
      lastLoggedIn: 'attacker-date', createdAt: 'attacker-date',
    };
    const token = (role) => jwt.sign({ _id: 'fixture', role }, secret, { expiresIn: '1h' });
    async function signup(authorization, body = payload) {
      const headers = { 'Content-Type': 'application/json' };
      if (authorization) headers.administrator = authorization;
      return fetch(url + '/api/admin/signup', { method: 'POST', headers, body: JSON.stringify(body) });
    }
    assert.equal((await signup()).status, 401);
    assert.equal((await signup('invalid-token')).status, 401);
    assert.equal((await signup(jwt.sign({ role: AdminRoles.SUPER_ADMIN }, secret, { expiresIn: -1 }))).status, 401);
    for (const role of Object.values(AdminRoles).filter(role => role !== AdminRoles.SUPER_ADMIN)) {
      assert.equal((await signup(token(role))).status, 401, role + ' must not create admins');
    }
    assert.equal(saved.length, 0);
    const superToken = token(AdminRoles.SUPER_ADMIN);
    assert.equal((await signup(superToken, { ...payload, role: 'unknown' })).status, 400);
    assert.equal((await signup(superToken, { ...payload, hasAccess: 'true' })).status, 400);
    assert.equal((await signup(superToken, { ...payload, email: 'invalid' })).status, 400);
    assert.equal(saved.length, 0);
    const response = await signup(superToken);
    assert.equal(response.status, 201);
    assert.equal((await response.json()).success, true);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].hasAccess, false);
    assert.equal(saved[0].email, payload.email);
    assert.equal(saved[0].phoneNo, payload.phoneNo);
    assert.equal(saved[0].readOnly, false);
    assert.equal(saved[0].registrationAt, '2026-10-17');
    assert.equal(saved[0].lastLoggedIn, null);
    assert.equal(saved[0]._id, undefined);
    assert.equal(saved[0].createdAt, undefined);
    assert.equal(await bcrypt.compare(payload.password, saved[0].password), true);
    // Also prove the persistence allowlist holds if the service is called directly.
    await service.adminSignup({ ...payload, hasAccess: undefined });
    assert.equal(saved[1].hasAccess, true);
    assert.equal(saved[1]._id, undefined);
    assert.equal(saved[1].readOnly, false);
    assert.equal(saved[1].createdAt, undefined);
    console.log('Admin signup security checks passed (isolated HTTP; no database writes).');
  } finally {
    await app.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
