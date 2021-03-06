import 'regenerator-runtime/runtime'
import { Curtains, Plane } from 'curtainsjs'
import fragment from './shaders/fragment.glsl'
import vertex from './shaders/vertex.glsl'

class WebglSlides {
	constructor(set) {
		this.canvas = set.canvas

		this.planeElement = set.planeElement
		this.multiTexturesPlane = null
		this.touchStartY = 0
		this.countSlides = set.planeElement.querySelectorAll("img").length - 1
		this.slidesState = {
			activeTextureIndex: Math.ceil((set.progress.value / 100) * this.countSlides),
			nextTextureIndex: null,
			maxTextures: this.countSlides,
			navs: set.navs,

			isChanging: false,
			transitionTimer: 0,

			progress: set.progress,
			value: set.progress.value,
			next: null
		}
		this.params = {
			vertexShader: document.getElementById("vs")?.textContent || vertex,
			fragmentShader: document.getElementById("fs")?.textContent || fragment,
			uniforms: {
				transitionTimer: {
					name: "uTransitionTimer",
					type: "1f",
					value: 0,
				},
			},
		}

		this.init()
	}

	init() {
		this.setupCurtains()
		this.initPlane()
		this.update()
	}

	setupCurtains() {
		this.curtains = new Curtains({
			container: this.canvas,
			watchScroll: false,
			pixelRatio: Math.min(1.5, window.devicePixelRatio)
		})
		this.curtains.onError(() => this.error())
		this.curtains.onContextLost(() => this.restoreContext())
	}

	initPlane() {
		this.multiTexturesPlane = new Plane(this.curtains, this.planeElement, this.params)

		this.multiTexturesPlane
			.onLoading(texture => {
				texture.setMinFilter(this.curtains.gl.LINEAR_MIPMAP_NEAREST)
			})
			.onReady(() => {
				const activeTexture = this.multiTexturesPlane.createTexture({
					sampler: "activeTexture",
					fromTexture: this.multiTexturesPlane.textures[this.slidesState.activeTextureIndex]
				})
				const nextTexture = this.multiTexturesPlane.createTexture({
					sampler: "nextTexture",
					fromTexture: this.multiTexturesPlane.textures[this.slidesState.nextTextureIndex]
				})

				this.arrowEvent(activeTexture, nextTexture)
				this.keyboardEvent(activeTexture, nextTexture)
				this.touchEvent(activeTexture, nextTexture)
				this.wheelEvent(activeTexture, nextTexture)

			})
	}

	update() {
		this.multiTexturesPlane.onRender(() => {
			if (this.slidesState.isChanging) {
				this.slidesState.transitionTimer += (90 - this.slidesState.transitionTimer) * 0.1

				if (this.slidesState.transitionTimer >= 88.5 && this.slidesState.transitionTimer !== 90) {
					this.slidesState.transitionTimer = 90
				}
			}

			this.multiTexturesPlane.uniforms.transitionTimer.value = this.slidesState.transitionTimer
		})
	}

	arrowEvent(activeTexture, nextTexture) {
		this.slidesState.navs.forEach(nav => {
			nav.addEventListener('click', event => {
				const to = event.target.getAttribute('data-goto')
				this._animate(to, activeTexture, nextTexture)
			})
		})
	}

	keyboardEvent(activeTexture, nextTexture) {
		const that = this
		document.addEventListener('keyup', event => {
			if (document.querySelector('.modal--active')) {
				let to = undefined
				switch (event.key) {
					case 'ArrowDown':
						to = 'next'
						break
					case 'ArrowUp':
						to = 'prev'
						break
				}
				that._animate(to, activeTexture, nextTexture)
			}
		})
	}

	wheelEvent(activeTexture, nextTexture) {
		const that = this
		this.canvas.closest('.modal').addEventListener('wheel', event => {
			let to = undefined
			if (event.deltaY > 0) {
				to = 'next'
			} else if (event.deltaY < 0) {
				to = 'prev'
			}

			that._animate(to, activeTexture, nextTexture)
		})
	}

	touchEvent() {
		this.planeElement.addEventListener('touchstart', this._handleTouchStart.bind(this), false)
		this.planeElement.addEventListener('touchend', this._handleTouchEnd.bind(this), false)
	}

	_animateProgressBar() {
		if (this.slidesState.next) {
			if (this.slidesState.value == 100) {
				this.slidesState.value = 0
			}
			this.slidesState.value += 1
		} else {
			this.slidesState.value -= 1
			if (this.slidesState.value == 0) {
				this.slidesState.value = 100
			}
		}
		this.slidesState.progress.value = `${this.slidesState.value}`

		if (this.slidesState.value !== this.slidesState.steps) requestAnimationFrame(() => this._animateProgressBar())
	}

	_animate(to, activeTexture, nextTexture) {
		if (!this.slidesState.isChanging && to) {

			this.curtains.enableDrawing()

			this.slidesState.isChanging = true

			this._navigationDirection(to)
			this.slidesState.steps = Math.ceil((100 / this.slidesState.maxTextures) * this.slidesState.nextTextureIndex)
			requestAnimationFrame(() => this._animateProgressBar())

			nextTexture.setSource(this.multiTexturesPlane.images[this.slidesState.nextTextureIndex])

			setTimeout(() => {

				this.curtains.disableDrawing()

				this.slidesState.isChanging = false
				this.slidesState.activeTextureIndex = this.slidesState.nextTextureIndex

				activeTexture.setSource(this.multiTexturesPlane.images[this.slidesState.activeTextureIndex])

				this.slidesState.transitionTimer = 0

			}, 600)
		}
	}

	_navigationDirection(to) {
		if (to == 'next') {
			this.slidesState.next = true
			if (this.slidesState.activeTextureIndex < this.slidesState.maxTextures) {
				this.slidesState.nextTextureIndex = this.slidesState.activeTextureIndex + 1
			} else {
				this.slidesState.nextTextureIndex = 1
			}
		} else {
			this.slidesState.next = false
			if (this.slidesState.activeTextureIndex <= 1) {
				this.slidesState.nextTextureIndex = this.slidesState.maxTextures
			} else {
				this.slidesState.nextTextureIndex = this.slidesState.activeTextureIndex - 1
			}
		}
	}

	_handleTouchStart(event) {
		this.touchStartX = event.touches[0].pageX
	}

	_handleTouchEnd(event) {
		const moveX = event.changedTouches[event.changedTouches.length - 1].pageX - this.touchStartX
		if (moveX < -10) this.slidesState.navs[0].click()
		else if (moveX > 10) this.slidesState.navs[1].click()
	}

	error() {
		document.body.classList.add("no-curtains")
	}

	restoreContext() {
		this.curtains.restoreContext()
	}
}


document.addEventListener('DOMContentLoaded', () => {

	const modals = document.querySelectorAll('body:not(.is-animating) [data-modal]')
	modals.forEach(modal => modal.addEventListener('click', openModal, false))

	const closes = document.querySelectorAll('body:not(.is-animating) .modal__close')
	closes.forEach(close => close.addEventListener('click', closeModal, false))

	if (!isMobileDevice()) {
		const wakeyFixRequired = 'CSS' in window && typeof CSS.supports === 'function' && !CSS.supports('-webkit-appearance', 'none')

		const ROOT_CLASS = 'scrollscreen'
		document.documentElement.classList.add('custom-scroll')

		const createElement = (tag, name) => {
			const el = document.createElement(tag)
			el.className = `${ROOT_CLASS}--${name}`
			return el
		}

		const createScrollscreen = root => {

			const fragment = document.createDocumentFragment();
			[...root.childNodes].forEach(child => {
				fragment.appendChild(child)
			})

			const content = createElement('div', 'content')
			content.appendChild(fragment)
			root.appendChild(content)

			const track = createElement('div', 'track')
			root.appendChild(track)

			const slider = createElement('div', 'slider')
			track.appendChild(slider)

			let pendingFrame = null

			const redraw = () => {

				cancelAnimationFrame(pendingFrame)

				pendingFrame = requestAnimationFrame(() => {

					const contentHeight = content.scrollHeight
					const containerHeight = root.offsetHeight
					const percentageVisible = containerHeight / contentHeight
					const sliderHeight = percentageVisible * containerHeight
					const percentageOffset = content.scrollTop / (contentHeight - containerHeight)
					const sliderOffset = percentageOffset * (containerHeight - sliderHeight)

					track.style.opacity = percentageVisible === 1 ? 0 : 1

					slider.style.cssText = `
            height: ${sliderHeight}px;
            transform: translateY(${sliderOffset}px);
          `
				})

			}

			content.addEventListener('scroll', redraw)
			window.addEventListener('resize', redraw)

			redraw()

			if (!wakeyFixRequired) return

			const wakey = () => {
				requestAnimationFrame(() => {
					const offset = content.scrollTop
					content.scrollTop = offset + 1
					content.scrollTop = offset
				})
			}

			root.addEventListener('mouseenter', wakey)

			wakey()
		}

		[...document.querySelectorAll(`.${ROOT_CLASS}`)].forEach(createScrollscreen)

	}

	let splits = document.querySelectorAll('[data-text-animation]')

	splits.forEach(split => {
		let splitTextContent = split.textContent

		const span = document.createElement('span')
		span.classList.add('text-animation')
		span.appendChild(createFrameSlides(splitTextContent))
		split.appendChild(span)
	})
})

const randomRange = (min, max) => Math.random() * (max - min) + min

const isMobileDevice = () => (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1)

const elFactory = (type, attributes, ...children) => {
	const el = document.createElement(type)

	for (const key in attributes) {
		el.setAttribute(key, attributes[key])
	}

	children.forEach(child => {
		if (typeof child === 'string') el.appendChild(document.createTextNode(child))
		else el.appendChild(child)
	})

	return el
}

const createFrameSlides = chars => {
	const fragment = new DocumentFragment()
	chars = chars.split(' ')
	chars.forEach(char => {
		const el = elFactory(
			'span', {}, `${char}\u00A0`
		)
		fragment.appendChild(el)
	})

	return fragment
}

const requestAnimationFramePromise = () => new Promise(resolve => requestAnimationFrame(resolve))

const transitionEndPromise = (element, last) => {
	return new Promise(resolve => {
		element.addEventListener('transitionend', event => {
			if (event.propertyName !== last) return
			element.removeEventListener('transitionend', this)
			resolve()
		}, true)
	})
}
// Caution with the third parameter: 'last'
// When the property is short-hand, like background, border, stroke...
// but we only modify one of them, the Promise never resolve and animation never finish
// For example, if we modify stroke-dasharray, we must specify stroke-dasharray and not the stroke property
const animate = async (element, stylz, last) => {
	Object.assign(element.style, stylz)
	return transitionEndPromise(element, last).then(_ => requestAnimationFramePromise())
}

const transtionFrom = (el, start, appendTo) => {
	const styles = window.getComputedStyle(el)
	const rect = start.getBoundingClientRect()
	const style = {
		left: `${rect.left}px`,
		top: `${rect.top}px`,
		width: `${rect.width}px`,
		height: `${rect.height}px`,
		fontSize: styles.getPropertyValue('font-size'),
		position: `fixed`,
		backgroundSize: `cover`
	}
	Object.assign(el.style, style)
	appendTo.parentNode.append(el)
}

const transitionTo = (el, cssTransition) => {
	const styles = window.getComputedStyle(el)
	const rect = el.getBoundingClientRect()
	return {
		transition: `${cssTransition}`,
		top: `${rect.top}px`,
		left: `${rect.left}px`,
		width: `${rect.width}px`,
		height: `${rect.height}px`,
		fontSize: styles.getPropertyValue('font-size')
	}
}

const asyncImageLoader = url => {
	return new Promise((resolve, reject) => {
		const image = new Image()
		image.src = url
		image.onload = () => resolve(image)
		image.onerror = () => reject(new Error('could not load image'))
	})
}

// globals vars to control current modal state
let modalState = {}
let productState = {}
let webgl = {}


const openModal = event => {
	if (document.body.classList.contains('is-animating')) return
	document.body.classList.add('is-fade-in', 'is-animating')

	const product = event.target.closest('.product')
	const dataModalID = 'modal' + product.getAttribute('data-modal')
	const modal = document.querySelector('#' + dataModalID)
	product.style.pointerEvents = 'none'
	product.setAttribute('data-modal-active', true)

	const descriptionSpans = [...modal.querySelectorAll('.product__description .text-animation span')]
	const descriptionSpanHeight = `${Math.ceil(descriptionSpans[0].getBoundingClientRect().height)}px`
	descriptionSpans.forEach(span => span.style.height = descriptionSpanHeight)

	productState = {
		product,
		img: product.querySelector('.product__img'),
		title: product.querySelector('.product__title'),
		price: product.querySelector('.product__price')
	}

	modalState = {
		modal,
		img: modal.querySelector('.modal__image'),
		title: modal.querySelector('.product__title'),
		price: modal.querySelector('.product__price'),
		description: modal.querySelector('.product__description'),
		descriptionSpanHeight: descriptionSpanHeight
	}

	const cloneProductImg = productState.img.cloneNode(true)
	cloneProductImg.style.borderColor = 'transparent'
	transtionFrom(cloneProductImg, productState.img, product)
	const cloneProductTitle = productState.title.cloneNode(true)
	transtionFrom(cloneProductTitle, productState.title, product)
	const cloneProductPrice = productState.price.cloneNode(true)
	transtionFrom(cloneProductPrice, productState.price, product)

	const labels = modal.querySelector('.labels')
	const labelSizes = [...labels.querySelectorAll('.label')]
	const shapesRect = [...labels.querySelectorAll('.shape-rect')]
	const labelInputChecked = modal.querySelector('.labels input:checked')

	let delayLabels = 0
	let transtionTimeLabels = 800
	const labelW = parseInt(window.getComputedStyle(labelSizes[0], null).getPropertyValue('width'), 10)
	const labelH = parseInt(window.getComputedStyle(labelSizes[0], null).getPropertyValue('height'), 10)

	labels.classList.add('labels--animating')
	labelInputChecked.checked = false

	const animationAll = async () => {
		if (!webgl[dataModalID]) {
			const modalWebGL = modal.querySelector('.modal__webgl')
			const canvas = modalWebGL.querySelector('.canvas')
			const planeElement = modalWebGL.querySelector('.multi-textures')
			const navs = modalWebGL.querySelectorAll('[data-goto]')
			const progress = modalWebGL.querySelector('.progress')
			webgl[dataModalID] = new WebglSlides({
				canvas,
				planeElement,
				navs,
				progress
			})
		}
		animate(cloneProductTitle, transitionTo(modalState.title, 'top .8s ease-in .1s, left .8s ease-in .1s, width .8s ease-in .1s, height .8s ease-in .1s, font-size .8s ease-in .1s'), 'width')
		animate(cloneProductPrice, transitionTo(modalState.price, 'top .9s ease-in .2s, left .9s ease-in .2s, width .9s ease-in .2s, height .9s ease-in .2s, font-size .9s ease-in .2s'), 'width')
		await animate(cloneProductImg, transitionTo(modalState.img, 'top 1.2s linear .2s, left 1.2s cubic-bezier(0.4, 1, 0.7, 1) .2s, width 1.2s cubic-bezier(0.4, 1, 0.7, 1) .2s, height 1.2s linear .2s'), 'left')

		const descriptionSpanPromises = descriptionSpans.map(span => {
			return animate(span, {
				transition: `height ${randomRange(200, 800)}ms linear ${randomRange(10, 1000)}ms`,
				height: `0px`
			}, 'height')
		})

		const labelSizesPromises = labelSizes.map(label => {
			delayLabels += (labelW/(labelW*2 + labelH*2))*transtionTimeLabels
			return animate(label.querySelector('.shape-rect'), {
				transition: `stroke-dashoffset ${transtionTimeLabels}ms linear ${delayLabels}ms`,
				strokeDashoffset: '0'
			}, 'stroke-dashoffset')
		})

		modal.classList.add('modal--active')
		await Promise.all([...descriptionSpanPromises, ...labelSizesPromises])

		shapesRect.forEach(el => el.removeAttribute('style'))
		labelInputChecked.checked = true
		labels.classList.remove('labels--animating')

		cloneProductImg.remove()
		cloneProductTitle.remove()
		cloneProductPrice.remove()
		product.style.pointerEvents = ''
		document.body.classList.remove('is-fade-in', 'is-animating')
	}
	animationAll()
}


const closeModal = () => {
	if (document.body.classList.contains('is-animating')) return
	document.body.classList.add('is-animating')
	const imagesActive = modalState.modal.querySelectorAll('img')
	const progress = modalState.modal.querySelector('progress').value
	const currentActiveImageIndex = `${Math.round((+progress / 100) * (imagesActive.length - 1))}`
	const src = imagesActive[currentActiveImageIndex].getAttribute('src')

	productState.img.style.backgroundImage = `url(${src})`
	modalState.img.style.backgroundImage = `url(${src})`

	const cloneProductImg = modalState.img.cloneNode(true)
	const cloneProductTitle = modalState.title.cloneNode(true)
	const cloneProductPrice = modalState.price.cloneNode(true)

	const descriptionSpans = [...modalState.description.querySelectorAll('.text-animation span')]
	const labelChecked = modalState.modal.querySelector('.labels input:checked')

	const animationAll = async () => {
		await asyncImageLoader(src)
		const descriptionSpanPromises = descriptionSpans.map(span => {
			return animate(span, {
				transition: `height ${randomRange(100, 700)}ms linear ${randomRange(1, 800)}ms`,
				height: modalState.descriptionSpanHeight,
			}, 'height')
		})

		labelChecked.checked = false
		await Promise.all(descriptionSpanPromises)

		document.body.classList.add('is-fade-out')
		transtionFrom(cloneProductTitle, modalState.title, productState.title)
		animate(cloneProductTitle, transitionTo(productState.title, 'top .8s ease-in .1s, left .8s ease-in .1s, width .8s ease-in .1s, height .8s ease-in .1s, font-size .8s ease-in .1s'), 'width')
		transtionFrom(cloneProductPrice, modalState.price, productState.price)
		animate(cloneProductPrice, transitionTo(productState.price, 'top .8s ease-in .15s, left .8s ease-in .15s, width .8s ease-in .15s, height .8s ease-in .15s, font-size .8s ease-in .15s'), 'width')
		transtionFrom(cloneProductImg, modalState.img, productState.img)
		await animate(cloneProductImg, transitionTo(productState.img, 'top 1.5s ease-in 0s, left 1.5s ease-in 0s, width 1.5s ease-in 0s, height 1.5s ease-in 0s'), 'width')
		labelChecked.checked = true
		productState.product.setAttribute('data-modal-active', false)
		modalState.modal.classList.remove('modal--active')
		cloneProductImg.remove()
		cloneProductTitle.remove()
		cloneProductPrice.remove()
		descriptionSpans.forEach(span => span.style.height = 'initial')
		document.body.classList.remove('is-fade-out', 'is-animating')
	}

	animationAll()

}
