// tslint:disable-next-line:no-implicit-dependencies
import { ProgressInfo, UpdateInfo } from 'builder-util-runtime'
import { app, BrowserWindow, Event, ipcMain, Menu, Tray } from 'electron'
import log from 'electron-log'
import { autoUpdater } from 'electron-updater'
import * as path from 'path'
import * as url from 'url'
const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer')

import Communication from './communication'
import setMainMenu from './setMainMenu'

let isHidden = false
const isHot = Boolean(process.env.IS_HOT)
const isProd = process.env.NODE_ENV === 'production'
let isUpdating = false
let isQuiting = false
let mainWindow: BrowserWindow

// Logs level
log.transports.console.level = log.transports.file.level = process.env.NODE_ENV === 'production'
  ? false
  : process.env.NODE_ENV === 'developement' ? 'silly' : 'debug'

// AutoUpdater configuration
autoUpdater.logger = log
autoUpdater.autoDownload = false

// Start IPC events bus listener
const communication: Communication = new Communication()

// Instantiate tray item
let tray: Tray

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    backgroundColor: '#2e022a',
    frame: !isProd,
    height: 900,
    show: false,
    webPreferences: {
      devTools: !isProd,
      webSecurity: true,
    },
    width: 1500,
  })

  const indexPath: string = isHot
    ? url.format({
      host: '0.0.0.0:8080',
      pathname: '',
      protocol: 'http:',
      slashes: true,
    })
    : url.format({
      pathname: path.resolve(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true,
    })

  mainWindow.loadURL(indexPath)

  mainWindow.once('ready-to-show', () => {
    if (mainWindow === null) return

    mainWindow.show()
    if (!isProd) mainWindow.webContents.openDevTools()

    // Check for updates
    ipcMain.on('ipcRenderer:autoUpdater:downloadUpdate', () => {
      isUpdating = true
      autoUpdater.downloadUpdate()
    })
    ipcMain.on('ipcRenderer:autoUpdater:quitAndInstall', () => {
      isUpdating = true
      autoUpdater.quitAndInstall()
    })
    autoUpdater.checkForUpdatesAndNotify()
  })

  mainWindow.on('minimize', (event: Event) => {
    event.preventDefault()
    toggleMainWindows()
  })

  mainWindow.on('close', (event: Event) => {
    if (isQuiting) return

    event.preventDefault()
    toggleMainWindows()
  })
}

function updateTray(): void {
  const contextMenu: Menu = Menu.buildFromTemplate(
    (isHidden
      ? [
        {
          click: toggleMainWindows,
          label: 'Show Electra Desktop',
        },
      ]
      : [
        {
          click: toggleMainWindows,
          label: 'Mimize to Tray',
        },
      ]
    ).concat(
      [
        {
          click: exitApp,
          label: 'Exit',
        },
      ],
    ),
  )
  tray.setContextMenu(contextMenu)
}

async function exitApp(): Promise<void> {
  if (isUpdating) return
  isQuiting = true

  try {
    mainWindow.webContents.send('ipcMain:app:quit')
    log.info('Closing Electra daemon...')
    await communication.electraJs.wallet.stopDaemon()
    app.quit()
  }
  catch (err) {
    log.error(err)
    app.quit()
  }
}

function toggleMainWindows(): void {
  if (isHidden) {
    mainWindow.show()
    isHidden = false
    updateTray()

    return
  }

  mainWindow.hide()
  isHidden = true
  updateTray()
}

// autoUpdater.on('checking-for-update', () => {
//   mainWindow.webContents.send('ipcMain:autoUpdater:checking')
// })
autoUpdater.on('update-available', (info: UpdateInfo) => {
  mainWindow.webContents.send('ipcMain:autoUpdater:found', JSON.stringify(info))
})
/*autoUpdater.on('update-not-available', (info: any) => {
  mainWindow.webContents.send('ipcMain:autoUpdater:notFound', JSON.stringify(info))
})
autoUpdater.on('error', (err: any) => {
  mainWindow.webContents.send('ipcMain:autoUpdater:error', JSON.stringify(err))
})*/
autoUpdater.on('download-progress', (progressObj: ProgressInfo) => {
  mainWindow.webContents.send('ipcMain:autoUpdater:progress', JSON.stringify(progressObj))
})
autoUpdater.on('update-downloaded', (info: any) => {
  mainWindow.webContents.send('ipcMain:autoUpdater:downloaded', JSON.stringify(info))
})

app.once('ready', () => {
  log.info('Electra Desktop starting...')

  tray = new Tray(path.resolve(__dirname, 'assets/icons/tray.png'))
  tray.setToolTip('Electra Desktop')
  tray.on('click', toggleMainWindows)
  updateTray()

  // Enable copy, paste and other common shortcuts for MacOS
  if (process.platform === 'darwin') setMainMenu(exitApp)

  if (isHot && process.platform !== 'win32') {
    installExtension(REACT_DEVELOPER_TOOLS)
      .then((name: any) => {
        log.info(`Added Extension: ${name}`)
        createWindow()
      })
      .catch(log.error)

    return
  }

  createWindow()
})

app.once('before-quit', (event: Event) => {
  event.preventDefault()
  exitApp()
})
