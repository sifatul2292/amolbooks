const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const vm = require('node:vm');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const deps = path.resolve(__dirname, '../api/node_modules');
require(deps + '/reflect-metadata');
const mongoose = require(deps + '/mongoose');
const bcrypt = require(deps + '/bcrypt');
const { Module } = require(deps + '/@nestjs/common');
const { NestFactory } = require(deps + '/@nestjs/core');
const { OtpSchema } = require('../api/dist/schema/otp.schema');
const { OtpService } = require('../api/dist/pages/otp/otp.service');
const { OtpController } = require('../api/dist/pages/otp/otp.controller');
const { UserService } = require('../api/dist/pages/user/user.service');
const { UserController } = require('../api/dist/pages/user/user.controller');

function checkBridge() {
  const html = fs.readFileSync(path.join(__dirname, '../gtm-snippets/password-reset-security.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  class Xhr {
    constructor() { this.listeners = []; }
    open(method, url) { this.url = url; }
    send(body) { this.body = JSON.parse(body); }
    addEventListener(event, listener) { this.listeners.push(listener); }
    respond(data) {
      this.status = 200;
      this.responseText = JSON.stringify(data);
      for (const listener of this.listeners) listener.call(this);
    }
  }
  const context = { window: { XMLHttpRequest: Xhr }, XMLHttpRequest: Xhr, URL, Date,
    location: { hostname: 'www.amolbooks.com', origin: 'https://www.amolbooks.com', href: 'https://www.amolbooks.com/reset-password' } };
  vm.runInNewContext(script, context);
  const token = 'a'.repeat(64);
  const verify = new Xhr();
  verify.open('POST', 'https://apisub.amolbooks.com/api/otp/validate-otp');
  verify.send(JSON.stringify({ phoneNo: '01700000001', code: '123456' }));
  let reset;
  // Angular's callback runs after the bridge captures the verification response.
  verify.addEventListener('load', () => {
    reset = new Xhr();
    reset.open('PUT', 'https://apisub.amolbooks.com/api/user/reset-user-password');
    reset.send(JSON.stringify({ username: '01700000001', password: 'new-password' }));
  });
  verify.respond({ success: true, data: { resetToken: token } });
  assert.equal(reset.body.resetToken, token);
  const replay = new Xhr();
  replay.open('PUT', 'https://apisub.amolbooks.com/api/user/reset-user-password');
  replay.send(JSON.stringify({ username: '01700000001', password: 'new-password' }));
  assert.equal(replay.body.resetToken, undefined);
  const email = new Xhr();
  email.open('POST', 'https://apisub.amolbooks.com/api/otp/validate-otp-with-email');
  email.send(JSON.stringify({ email: 'fixture@example.com', code: '123456' }));
  email.respond({ success: true, data: { resetToken: token } });
  const other = new Xhr();
  other.open('PUT', 'https://evil.example/api/user/reset-user-password');
  other.send(JSON.stringify({ username: 'fixture@example.com', password: 'new-password' }));
  assert.equal(other.body.resetToken, undefined);
  const emailReset = new Xhr();
  emailReset.open('PUT', 'https://apisub.amolbooks.com/api/user/reset-user-password');
  emailReset.send(JSON.stringify({ username: 'fixture@example.com', password: 'new-password' }));
  assert.equal(emailReset.body.resetToken, token);
}

async function main() {
  checkBridge();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'amol-reset-security-'));
  const socket = net.createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  // Own disposable mongod; never connects to any application database.
  const mongo = spawn('mongod', ['--dbpath', directory, '--bind_ip', '127.0.0.1', '--port', String(port), '--quiet'], { stdio: 'ignore' });
  let mongoError;
  mongo.on('error', error => { mongoError = error; });
  let connection, app;
  try {
    for (let attempt = 0; attempt < 40; attempt++) {
      if (mongoError) throw mongoError;
      if (mongo.exitCode !== null) throw new Error('Disposable mongod failed to start');
      connection = mongoose.createConnection(`mongodb://127.0.0.1:${port}/reset_fixture`, { serverSelectionTimeoutMS: 250 });
      try { await connection.asPromise(); break; }
      catch (error) { await connection.close().catch(() => {}); connection = null; }
    }
    assert.ok(connection, 'Disposable MongoDB must start');
    const Otp = connection.model('Otp', OtpSchema);
    const User = connection.model('User', new mongoose.Schema({ username: String, password: String }));
    await Otp.init();
    const codes = new Map();
    const recordCode = (identity, message) => codes.set(identity, message.match(/\b\d{6}\b/)[0]);
    const otpService = new OtpService(Otp, { addMinuteInCurrentTime: n => new Date(Date.now() + n * 60000) },
      { sentSingleSms: recordCode }, { sendEmail: (email, subject, html) => recordCode(email, html) });
    const userService = new UserService(User, null, null, null, null, null, null, otpService);
    class FixtureModule {}
    Module({ controllers: [UserController, OtpController], providers: [
      { provide: UserService, useValue: userService }, { provide: OtpService, useValue: otpService },
    ] })(FixtureModule);
    app = await NestFactory.create(FixtureModule, { logger: false });
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    const url = await app.getUrl();
    async function request(route, body, method = 'POST') {
      const response = await fetch(url + '/api/' + route, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return { status: response.status, body: await response.json() };
    }
    const phone = '01700000001', email = 'fixture@example.com';
    await User.create([{ username: phone, password: 'original' }, { username: email, password: 'original' }]);
    const reset = (username, resetToken) => request('user/reset-user-password', { username, password: 'new-password', resetToken }, 'PUT');
    const generate = identity => request(identity.includes('@') ? 'otp/generate-otp-with-email' : 'otp/generate-otp', identity.includes('@') ? { email: identity } : { phoneNo: identity });
    const verify = (identity, code = codes.get(identity)) => request(identity.includes('@') ? 'otp/validate-otp-with-email' : 'otp/validate-otp', identity.includes('@') ? { email: identity, code } : { phoneNo: identity, code });
    assert.equal((await reset(phone)).status, 400);
    assert.equal((await reset(phone, 'a'.repeat(64))).status, 401);
    assert.equal((await User.findOne({ username: phone })).password, 'original');
    await generate(phone);
    assert.equal((await verify(phone, '000000')).body.success, false);
    const valid = await verify(phone);
    assert.equal(valid.body.success, true);
    const token = valid.body.data.resetToken;
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.equal((await request('user/reset-user-password', { username: phone, password: 'x', resetToken: token }, 'PUT')).status, 400);
    assert.equal((await request('user/reset-user-password', { password: 'new-password', resetToken: token }, 'PUT')).status, 400);
    const stored = await Otp.findOne({ phoneNo: phone });
    assert.notEqual(stored.resetTokenHash, token);
    assert.equal(stored.resetTokenExpiresAt.getTime() > Date.now(), true);
    assert.equal((await verify(phone)).body.success, false, 'OTP is single use');
    assert.equal((await reset(email, token)).status, 401, 'Token is bound to identity');
    const concurrent = await Promise.all([reset(phone, token), reset(phone, token)]);
    assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 401]);
    assert.equal(await bcrypt.compare('new-password', (await User.findOne({ username: phone })).password), true);
    assert.equal((await reset(phone, token)).status, 401, 'No replay');
    await generate(email);
    const emailToken = (await verify(email)).body.data.resetToken;
    assert.equal((await reset(email, emailToken)).status, 200);
    await generate(phone);
    await Otp.updateOne({ phoneNo: phone }, { $set: { expireTime: new Date(Date.now() - 1000) } });
    assert.equal((await verify(phone)).body.success, false, 'Expired OTP rejected');
    await generate(phone);
    for (let i = 0; i < 5; i++) assert.equal((await verify(phone, '000000')).body.success, false);
    assert.equal((await verify(phone)).body.success, false, 'OTP locked after five guesses');
    await generate(phone);
    let resetToken = (await verify(phone)).body.data.resetToken;
    await Otp.updateOne({ phoneNo: phone }, { $set: { resetTokenExpiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await reset(phone, resetToken)).status, 401, 'Expired token rejected');
    await generate(phone);
    resetToken = (await verify(phone)).body.data.resetToken;
    await generate(phone);
    assert.equal((await reset(phone, resetToken)).status, 401, 'Resending invalidates reset proof');
    const results = await Promise.all([verify(phone), verify(phone)]);
    assert.equal(results.filter(r => r.body.success).length, 1, 'Concurrent OTP verification issues one proof');
    await Otp.collection.insertOne({ phoneNo: '01700000002', code: '654321', expireTime: new Date(Date.now() + 60000).toString() });
    assert.equal((await verify('01700000002', '654321')).body.success, true, 'Legacy OTP records need no migration');
    console.log('Password reset security checks passed (disposable MongoDB, isolated HTTP, storefront bridge).');
  } finally {
    if (app) await app.close();
    if (connection) await connection.close();
    if (mongo.exitCode === null && !mongoError) {
      const stopped = once(mongo, 'exit');
      mongo.kill('SIGTERM');
      await stopped;
    }
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
