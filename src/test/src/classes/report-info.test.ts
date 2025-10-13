// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as assert from 'assert'
import chai from 'chai'
import spies from 'chai-spies'
import { type TmpDataCache, createTmpDataCache } from '../../helpers/test-helpers'
import { after, before, beforeEach } from 'mocha'
import ReportInfo from '../../../task-timer/classes/report-info'
import fs from 'fs'
import expectedReportData from '../../data/expected/expected-report-data.json'
import path from 'path'

chai.use(spies)

/**
 * Somewhat high-level unit tests for report generation.  Simply verify that with sample data, results are as expected.
 * (Calculate manually to verify test files)
 *
 * For additional coverage, files can be added/modified in the data directory to cover extra scenarios.
 * Just change the expected data and CSV to match if collated values change.
 */
suite('ReportInfo', () => {
  let tmpDataCache: TmpDataCache,
    reportInfo: ReportInfo,
    expectedCSV: string

  before(() => {
    tmpDataCache = createTmpDataCache()
    expectedCSV = fs.readFileSync(path.join(tmpDataCache.path, 'expected/expected-report-csv.csv'), { encoding: 'utf-8' })
  })

  after(() => {
    tmpDataCache.delete()
  })

  beforeEach(() => {
    // date on Wednesday to make sure it goes back to Monday for report.
    reportInfo = new ReportInfo(tmpDataCache.path, new Date(2024, 2, 13))
  })

  suite('getWeeklyData', () => {
    test('it produces expected output', () => {
      const results = reportInfo.getWeeklyData(new Date(2024, 2, 13))

      assert.deepEqual(JSON.parse(JSON.stringify(results)), JSON.parse(JSON.stringify(expectedReportData)))
    })
  })

  suite('toCSV', () => {
    test('it produces expected CSV', () => {
      const results = reportInfo.toCSV()

      assert.equal(results, expectedCSV)
    })
  })
})
