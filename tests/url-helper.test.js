import test from 'node:test';
import assert from 'node:assert/strict';

import {
  constructUrlWithFlags,
  generatePortalUrl,
  getFlagsFromUrl,
  isSupportedUrl,
  parseFlag
} from '../src/utils/url-helper.js';

const STANDARD_HOSTS = [
  'security.microsoft.com',
  'security.officeppe.com',
  'dev.security.microsoft.com',
  'sip.security.microsoft.com',
  'df.security.microsoft.com'
];

const MTO_HOSTS = STANDARD_HOSTS.map(host => `mto.${host}`);

test('recognizes every standard and MTO portal hostname', () => {
  for (const host of [...STANDARD_HOSTS, ...MTO_HOSTS]) {
    assert.equal(
      isSupportedUrl(`https://${host}/incidents/123?tid=tenant#details`),
      true,
      host
    );
  }
});

test('rejects hostile, unsupported, and malformed host variants', () => {
  const unsupportedInputs = [
    'https://mto.microsoft.com/',
    'https://security.mto.microsoft.com/',
    'https://dev.mto.security.microsoft.com/',
    'https://mto.mto.security.microsoft.com/',
    'https://foo.mto.security.microsoft.com/',
    'https://mto-security.microsoft.com/',
    'https://mto.security.microsoft.com.example.com/',
    'https://notsecurity.microsoft.com/',
    '',
    'not a valid URL'
  ];

  for (const input of unsupportedInputs) {
    assert.equal(isSupportedUrl(input), false, input);
  }
});

test('parses enabled and force-disabled flags', () => {
  assert.deepEqual(parseFlag(' FlagA '), { name: 'FlagA', value: true });
  assert.deepEqual(parseFlag(' FlagB:false '), { name: 'FlagB', value: false });
  assert.deepEqual(parseFlag('FlagC:FALSE'), { name: 'FlagC', value: false });

  for (const host of ['security.microsoft.com', 'mto.security.microsoft.com']) {
    assert.deepEqual(
      getFlagsFromUrl(
        `https://${host}/?flight=%20FlagA%20,%20FlagB:false%20,,%20FlagC%20`
      ),
      [
        { name: 'FlagA', value: true },
        { name: 'FlagB', value: false },
        { name: 'FlagC', value: true }
      ]
    );
    assert.deepEqual(getFlagsFromUrl(`https://${host}/?tid=tenant`), []);
  }

  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(getFlagsFromUrl('not a valid URL'), []);
  } finally {
    console.error = originalConsoleError;
  }
});

test('serializes flags identically on standard and MTO URLs', () => {
  const flags = new Map([
    ['EnabledFlag', true],
    ['DisabledFlag', false],
    ['IgnoredNull', null],
    ['IgnoredUndefined', undefined]
  ]);

  for (const host of ['security.microsoft.com', 'mto.security.microsoft.com']) {
    const result = new URL(
      constructUrlWithFlags(
        `https://${host}/incidents?flight=OldFlag&tid=tenant`,
        flags
      )
    );

    assert.equal(result.hostname, host);
    assert.equal(result.searchParams.get('flight'), 'EnabledFlag,DisabledFlag:false');
    assert.equal(result.searchParams.getAll('flight').length, 1);
    assert.equal(result.searchParams.get('tid'), 'tenant');
  }
});

test('removes flight when no serializable flags remain', () => {
  const baseUrl = 'https://mto.security.microsoft.com/?flight=OldFlag&tid=tenant';

  for (const flags of [
    new Map(),
    new Map([
      ['IgnoredNull', null],
      ['IgnoredUndefined', undefined]
    ])
  ]) {
    const result = new URL(constructUrlWithFlags(baseUrl, flags));
    assert.equal(result.searchParams.has('flight'), false);
    assert.equal(result.searchParams.get('tid'), 'tenant');
  }
});

test('preserves standard and MTO URL components while replacing flight', () => {
  for (const host of ['security.microsoft.com', 'mto.security.microsoft.com']) {
    const result = new URL(
      constructUrlWithFlags(
        `https://${host}/incidents/123?tid=tenant&foo=bar&flight=OldFlag#details`,
        new Map([
          ['FlagA', true],
          ['FlagB', false]
        ])
      )
    );

    assert.equal(result.protocol, 'https:');
    assert.equal(result.hostname, host);
    assert.equal(result.pathname, '/incidents/123');
    assert.equal(result.searchParams.get('tid'), 'tenant');
    assert.equal(result.searchParams.get('foo'), 'bar');
    assert.equal(result.searchParams.get('flight'), 'FlagA,FlagB:false');
    assert.equal(result.hash, '#details');
  }
});

test('default navigation remains on the standard production portal', () => {
  const withFlags = new URL(
    generatePortalUrl(
      new Map([
        ['FlagA', true],
        ['FlagB', false]
      ])
    )
  );

  assert.equal(withFlags.origin, 'https://security.microsoft.com');
  assert.notEqual(withFlags.hostname, 'mto.security.microsoft.com');
  assert.equal(withFlags.searchParams.get('flight'), 'FlagA,FlagB:false');

  const withoutFlags = new URL(generatePortalUrl(new Map()));
  assert.equal(withoutFlags.href, 'https://security.microsoft.com/');
  assert.equal(withoutFlags.searchParams.has('flight'), false);
});
