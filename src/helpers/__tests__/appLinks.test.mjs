import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { buildAppUrl, buildInviteLink, buildLoginLink } from '../appLinks.js'

const PROD = 'https://maxtune.ictskills.center'

describe('buildInviteLink (hash router, production SPA)', () => {
  test('uses the /#/register?code= form', () => {
    assert.equal(
      buildInviteLink({ origin: PROD, code: 'ABC123XYZ9' }),
      `${PROD}/#/register?code=ABC123XYZ9`,
    )
  })

  test('tolerates a trailing slash on the origin', () => {
    assert.equal(
      buildInviteLink({ origin: `${PROD}/`, code: 'FRIEND1' }),
      `${PROD}/#/register?code=FRIEND1`,
    )
  })

  test('trims whitespace and percent-encodes the code', () => {
    assert.equal(
      buildInviteLink({ origin: PROD, code: '  a b&c  ' }),
      `${PROD}/#/register?code=a%20b%26c`,
    )
  })

  test('returns "" when there is no code', () => {
    assert.equal(buildInviteLink({ origin: PROD, code: '' }), '')
    assert.equal(buildInviteLink({ origin: PROD, code: '   ' }), '')
    assert.equal(buildInviteLink({ origin: PROD, code: null }), '')
    assert.equal(buildInviteLink({ origin: PROD }), '')
  })

  test('works on dev origins (explicit port)', () => {
    assert.equal(
      buildInviteLink({ origin: 'http://127.0.0.1:9100', code: 'DEV' }),
      'http://127.0.0.1:9100/#/register?code=DEV',
    )
  })

  test('respects a sub-path router base in hash mode', () => {
    assert.equal(
      buildInviteLink({ origin: PROD, code: 'X1', base: '/app/' }),
      `${PROD}/app/#/register?code=X1`,
    )
  })
})

describe('buildInviteLink (history router)', () => {
  test('plain /register?code=', () => {
    assert.equal(
      buildInviteLink({ origin: PROD, code: 'ABC', mode: 'history' }),
      `${PROD}/register?code=ABC`,
    )
  })

  test('with a base path', () => {
    assert.equal(
      buildInviteLink({ origin: PROD, code: 'ABC', mode: 'history', base: '/app/' }),
      `${PROD}/app/register?code=ABC`,
    )
  })
})

describe('buildAppUrl / buildLoginLink', () => {
  test('login link', () => {
    assert.equal(buildLoginLink({ origin: PROD }), `${PROD}/#/login`)
  })

  test('skips empty query values and tolerates a missing leading slash', () => {
    assert.equal(
      buildAppUrl({ origin: PROD, path: 'register', query: { code: '', ref: null } }),
      `${PROD}/#/register`,
    )
  })
})
