/* eslint-disable no-new */
import { mount } from 'svelte'
import App from '../components/SidebarMain.svelte'

const target = document.getElementById('time-keeper-sidebar-main')

if (target === null) {
  throw new Error('Target element for Sidebar not found')
}

const app = mount(App, {
  target
})

export default app
