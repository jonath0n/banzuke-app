import { describe, expect, it } from 'vitest'
import { isStable, validateStablesFile } from './stables'
import { makeStable, makeStablesFile } from '../test/fixtures'

describe('validateStablesFile', () => {
  it('accepts the fixture file', () => {
    const result = validateStablesFile(makeStablesFile())
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.file.stables['1'].master?.formerShikona.en).toBe('Asahiyutaka')
  })

  it('accepts a stable without a master or an address', () => {
    expect(isStable(makeStable({ master: null, address: null }))).toBe(true)
  })

  it('rejects the wrong version, a missing name, a mismatched key and a malformed master', () => {
    expect(validateStablesFile({ ...makeStablesFile(), version: 2 })).toMatchObject({
      ok: false,
      error: 'unsupported version 2',
    })
    expect(
      validateStablesFile(
        makeStablesFile({ stables: { '1': { ...makeStable(), name: 'Tatsunami' } as never } })
      )
    ).toMatchObject({ ok: false, error: 'stable 1 is malformed' })
    expect(validateStablesFile(makeStablesFile({ stables: { '2': makeStable() } }))).toMatchObject({
      ok: false,
      error: 'stable 2 has id 1',
    })
    expect(
      validateStablesFile(
        makeStablesFile({
          stables: { '1': makeStable({ master: { name: { en: 'x', jp: '' } } as never }) },
        })
      )
    ).toMatchObject({ ok: false })
    expect(validateStablesFile(null)).toMatchObject({ ok: false })
  })
})
