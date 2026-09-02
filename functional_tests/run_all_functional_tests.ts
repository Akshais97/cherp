import { testAppBootAndAuth } from './01_app_boot_and_auth.test'
import { testDashboardAndSearch } from './02_dashboard_and_search.test'
import { testTasksAndViews } from './03_tasks_and_views.test'
import { testClientsTeamAndRbac } from './04_clients_team_rbac.test'
import { testAttachmentsCommentsAndTime } from './05_attachments_comments_time.test'
import { testUiStatesAndResponsiveness } from './06_ui_states_and_responsiveness.test'

async function runAllFunctionalTests() {
  const startTime = Date.now()
  console.log('\n========================================================================')
  console.log('    CHERP ERP - EXECUTING ALL 32 FUNCTIONAL TEST SUITE SCENARIOS       ')
  console.log('========================================================================')

  try {
    await testAppBootAndAuth()
    await testDashboardAndSearch()
    await testTasksAndViews()
    await testClientsTeamAndRbac()
    await testAttachmentsCommentsAndTime()
    await testUiStatesAndResponsiveness()

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log('\n========================================================================')
    console.log(`🎉 ALL 32 FUNCTIONAL TEST CASES PASSED 100% CLEANLY IN ${duration}s!`)
    console.log('========================================================================\n')
  } catch (error) {
    console.error('\n❌ FUNCTIONAL TEST SUITE FAILED WITH ERROR:', error)
    process.exit(1)
  }
}

runAllFunctionalTests()
