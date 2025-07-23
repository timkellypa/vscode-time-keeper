/* eslint-disable no-new */
import { mount } from 'svelte'
import App from '../components/Sidebar.svelte'

const target = document.getElementById('time-keeper-sidebar')

if (target === null) {
  throw new Error('Target element for Sidebar not found')
}

const app = mount(App, {
  target
})

export default app
