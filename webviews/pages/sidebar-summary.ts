/* eslint-disable no-new */
import { mount } from 'svelte'
import App from '../components/TimeLogSummary.svelte'

const target = document.getElementById('time-keeper-sidebar-summary')

if (target === null) {
  throw new Error('Target element for TimeLogSummary not found')
}

const app = mount(App, {
  target
})

export default app
