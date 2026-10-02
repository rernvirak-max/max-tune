import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCreateUserPayload,
  fieldErrorsFromApiError,
  formatCredentials,
  gbToBytes,
  validateCreateUser,
} from '../adminUsers.js'

const GB = 1024 ** 3
const base = {
  name: 'Sokha',
  email: 'sokha@example.com',
  generate: true,
  password: '',
  quotaGb: '',
}

describe('gbToBytes', () => {
  test('converts whole and fractional GB', () => {
    assert.equal(gbToBytes(2), 2 * GB)
    assert.equal(gbToBytes('0.5'), GB / 2)
    assert.equal(gbToBytes(0), 0)
  })
  test('blank / invalid → null (engine default)', () => {
    for (const v of ['', '  ', null, undefined, 'abc', -1]) assert.equal(gbToBytes(v), null)
  })
})

describe('validateCreateUser', () => {
  test('valid with generated password', () => {
    assert.deepEqual(validateCreateUser(base), {})
  })
  test('requires name and a valid email', () => {
    assert.ok(validateCreateUser({ ...base, name: '  ' }).name)
    assert.ok(validateCreateUser({ ...base, email: '' }).email)
    assert.ok(validateCreateUser({ ...base, email: 'nope' }).email)
  })
  test('password only checked when not generating', () => {
    assert.deepEqual(validateCreateUser({ ...base, generate: true, password: 'x' }), {})
    assert.ok(validateCreateUser({ ...base, generate: false, password: 'short' }).password)
    assert.deepEqual(validateCreateUser({ ...base, generate: false, password: 'longenough' }), {})
  })
  test('quota optional but must be >= 0', () => {
    assert.deepEqual(validateCreateUser({ ...base, quotaGb: '' }), {})
    assert.deepEqual(validateCreateUser({ ...base, quotaGb: 0 }), {})
    assert.ok(validateCreateUser({ ...base, quotaGb: -2 }).quota)
    assert.ok(validateCreateUser({ ...base, quotaGb: 'abc' }).quota)
  })
})

describe('buildCreateUserPayload', () => {
  test('generate → no password, no quota, never is_admin', () => {
    const p = buildCreateUserPayload({ ...base, name: ' Sokha ', email: ' sokha@example.com ' })
    assert.deepEqual(p, { name: 'Sokha', email: 'sokha@example.com' })
    assert.ok(!('is_admin' in p) && !('role' in p))
  })
  test('typed password and quota are sent', () => {
    const p = buildCreateUserPayload({
      ...base,
      generate: false,
      password: 'chosen-pass',
      quotaGb: '2',
    })
    assert.deepEqual(p, {
      name: 'Sokha',
      email: 'sokha@example.com',
      password: 'chosen-pass',
      quota_bytes: 2 * GB,
    })
  })
  test('a typed password is dropped while "generate" is on', () => {
    assert.ok(
      !(
        'password' in buildCreateUserPayload({ ...base, generate: true, password: 'leftover-text' })
      ),
    )
  })
})

describe('fieldErrorsFromApiError', () => {
  test('maps the engine 422 shape to first message per field', () => {
    const err = {
      status: 422,
      body: {
        message: 'x (and 1 more error)',
        errors: {
          email: ['A user with this email already exists'],
          quota_bytes: ['bad'],
          name: ['n1', 'n2'],
        },
      },
    }
    assert.deepEqual(fieldErrorsFromApiError(err), {
      name: 'n1',
      email: 'A user with this email already exists',
      quota: 'bad',
    })
  })
  test('non-422 and malformed errors → {}', () => {
    assert.deepEqual(
      fieldErrorsFromApiError({ status: 500, body: { errors: { email: ['x'] } } }),
      {},
    )
    assert.deepEqual(fieldErrorsFromApiError({ status: 0 }), {})
    assert.deepEqual(fieldErrorsFromApiError(new TypeError('Failed to fetch')), {})
    assert.deepEqual(fieldErrorsFromApiError(null), {})
  })
})

describe('formatCredentials', () => {
  test('temporary password block', () => {
    assert.equal(
      formatCredentials({
        email: 'a@b.co',
        password: 'pw123456',
        loginUrl: 'https://x/#/login',
        temporary: true,
      }),
      'MaxTune sign-in\nEmail: a@b.co\nTemporary password: pw123456\nSign in: https://x/#/login',
    )
  })
  test('chosen password, no link', () => {
    assert.equal(
      formatCredentials({ email: 'a@b.co', password: 'pw' }),
      'MaxTune sign-in\nEmail: a@b.co\nPassword: pw',
    )
  })
})
