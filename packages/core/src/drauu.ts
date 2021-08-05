import { createModels } from './models'
import { Brush, Options, DrawingMode } from './types'

export class Drauu {
  el: SVGSVGElement | null = null
  mode: DrawingMode
  brush: Brush
  shiftPressed = false

  private _models = createModels(this)
  private _currentNode: SVGElement | undefined
  private _undoStack: Node[] = []
  private _disposables: (() => void)[] = []

  constructor(public options: Options = {}) {
    this.brush = options.brush || { color: 'black', size: 2 }
    this.mode = options.mode || 'draw'
    if (options.el)
      this.mount(options.el)
  }

  get model() {
    return this._models[this.mode]
  }

  mount(selector: string | SVGSVGElement) {
    if (typeof selector === 'string')
      this.el = document.querySelector(selector)
    else
      this.el = selector

    if (!this.el)
      throw new Error('[drauu] target element not found')
    if (this.el.tagName !== 'svg')
      throw new Error('[drauu] can only mount to a SVG element')

    const el = this.el

    const start = this.eventStart.bind(this)
    const move = this.eventMove.bind(this)
    const end = this.eventEnd.bind(this)
    const keyboard = this.eventKeyboard.bind(this)

    el.addEventListener('mousedown', start, false)
    el.addEventListener('touchstart', start, false)
    el.addEventListener('mousemove', move, false)
    el.addEventListener('touchmove', move, false)
    el.addEventListener('mouseup', end, false)
    el.addEventListener('touchend', end, false)
    window.addEventListener('keydown', keyboard, false)
    window.addEventListener('keyup', keyboard, false)

    this._disposables.push(() => {
      el.removeEventListener('mousedown', start, false)
      el.removeEventListener('touchstart', start, false)
      el.removeEventListener('mousemove', move, false)
      el.removeEventListener('touchmove', move, false)
      el.removeEventListener('mouseup', end, false)
      el.removeEventListener('touchend', end, false)
      window.removeEventListener('keydown', keyboard, false)
      window.removeEventListener('keyup', keyboard, false)
    })
  }

  unmounted() {
    this._disposables.forEach(fn => fn())
    this._disposables.length = 0
  }

  undo() {
    const el = this.el!
    if (!el.lastElementChild)
      return false
    this._undoStack.push(el.lastElementChild.cloneNode(true))
    el.lastElementChild.remove()
    return true
  }

  redo() {
    if (!this._undoStack.length)
      return false
    this.el!.appendChild(this._undoStack.pop()!)
    return true
  }

  private eventMove(event: MouseEvent | TouchEvent) {
    if (this.model._eventMove(event)) {
      event.stopPropagation()
      event.preventDefault()
    }
  }

  private eventStart(event: MouseEvent | TouchEvent) {
    event.stopPropagation()
    event.preventDefault()
    this._currentNode = this.model._eventDown(event)
    if (this._currentNode)
      this.el!.appendChild(this._currentNode)
  }

  private eventEnd(event: MouseEvent | TouchEvent) {
    const result = this.model._eventUp(event)
    if (!result) {
      this.cancel()
    }
    else {
      if (result instanceof Element && result !== this._currentNode)
        this._currentNode = result
      this.commit()
    }
  }

  private eventKeyboard(event: KeyboardEvent) {
    this.shiftPressed = event.shiftKey
    // redraw
    this.model.onMove(this.model.point)
  }

  private commit() {
    this._undoStack.length = 0
    this._currentNode = undefined
  }

  clear() {
    this._undoStack.length = 0
    this.cancel()
    this.el!.innerHTML = ''
  }

  cancel() {
    if (this._currentNode) {
      this.el!.removeChild(this._currentNode)
      this._currentNode = undefined
    }
  }
}

export function createDrauu(options?: Options) {
  return new Drauu(options)
}