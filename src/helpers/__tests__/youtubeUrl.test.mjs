import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { parseYoutubeUrl } from '../youtubeUrl.js'

const ID = 'Ex4mpleVid0'

describe('parseYoutubeUrl: accepted links (handoff §3 table)', () => {
  const cases = [
    ['watch', `https://www.youtube.com/watch?v=${ID}`],
    ['watch without www', `https://youtube.com/watch?v=${ID}`],
    ['mobile watch', `https://m.youtube.com/watch?v=${ID}&t=42`],
    ['youtu.be', `https://youtu.be/${ID}`],
    ['youtu.be with share tracking', `https://youtu.be/${ID}?si=abc123`],
    ['YouTube Music', `https://music.youtube.com/watch?v=${ID}`],
    ['missing scheme', `youtube.com/watch?v=${ID}`],
    ['plain http', `http://www.youtube.com/watch?v=${ID}`],
    ['upper-case host', `https://WWW.YOUTUBE.COM/watch?v=${ID}`],
    ['surrounding whitespace', `  https://youtu.be/${ID}  `],
  ]

  for (const [name, input] of cases) {
    test(name, () => {
      assert.deepEqual(parseYoutubeUrl(input), {
        status: 'valid',
        videoId: ID,
        isShort: false,
        listIgnored: false,
      })
    })
  }

  test('Shorts are allowed and flagged', () => {
    assert.deepEqual(parseYoutubeUrl(`https://youtube.com/shorts/${ID}`), {
      status: 'valid',
      videoId: ID,
      isShort: true,
      listIgnored: false,
    })
  })

  test('IDs may contain - and _', () => {
    assert.equal(parseYoutubeUrl('https://youtu.be/a-b_c-d_e-f').videoId, 'a-b_c-d_e-f')
  })

  test('list= on a watch link is ignored, with the info flag set', () => {
    assert.deepEqual(parseYoutubeUrl(`https://www.youtube.com/watch?v=${ID}&list=PLexample123`), {
      status: 'valid',
      videoId: ID,
      isShort: false,
      listIgnored: true,
    })
  })
})

describe('parseYoutubeUrl: playlists', () => {
  test('playlist page', () => {
    assert.deepEqual(parseYoutubeUrl('https://www.youtube.com/playlist?list=PLexample123'), {
      status: 'playlist',
    })
  })

  test('watch link with list= but no v=', () => {
    assert.deepEqual(parseYoutubeUrl('https://www.youtube.com/watch?list=PLexample123'), {
      status: 'playlist',
    })
  })
})

describe('parseYoutubeUrl: rejected links', () => {
  const cases = [
    ['another site', 'https://vimeo.com/123456'],
    ['look-alike host', `https://youtube.com.evil.test/watch?v=${ID}`],
    ['channel page', 'https://www.youtube.com/@someone'],
    ['ID too short', 'https://www.youtube.com/watch?v=short'],
    ['ID too long', `https://youtu.be/${ID}x`],
    ['ID with invalid characters', 'https://youtu.be/Ex4mple$id0'],
    ['ambiguous repeated v=', `https://www.youtube.com/watch?v=${ID}&v=0therVide01`],
    ['javascript: pseudo-link', `javascript:alert(1)//youtube.com/watch?v=${ID}`],
    ['non-http scheme', `ftp://youtube.com/watch?v=${ID}`],
    ['shorts without an ID', 'https://youtube.com/shorts/'],
    ['plain text', 'not a url at all'],
  ]

  for (const [name, input] of cases) {
    test(name, () => {
      assert.deepEqual(parseYoutubeUrl(input), { status: 'invalid' })
    })
  }
})

describe('parseYoutubeUrl: empty input', () => {
  for (const input of ['', '   ', null, undefined]) {
    test(`${JSON.stringify(input)} is empty, not an error`, () => {
      assert.deepEqual(parseYoutubeUrl(input), { status: 'empty' })
    })
  }
})
