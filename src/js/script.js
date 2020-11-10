import { Curtains, Plane } from 'curtainsjs';
import fragment from './shaders/fragment.glsl'
import vertex from './shaders/vertex.glsl'

class WebglSlides {
	constructor(set) {
		this.canvas = set.canvas

		this.planeElement = set.planeElement
		this.multiTexturesPlane = null
		this.touchStartY = 0
		this.slidesState = {
			activeTextureIndex: 1,
			nextTextureIndex: null,
			maxTextures: set.planeElement.querySelectorAll("img").length - 1, // -1 to displacement
			navs: set.navs,

			isChanging: false,
			transitionTimer: 0,

			progress: set.progress,
			value: 16,
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
		this.curtains.onError(() => this.error());
		this.curtains.onContextLost(() => this.restoreContext());
	}

	initPlane () {
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

	update () {
		this.multiTexturesPlane.onRender(() => {
			if (this.slidesState.isChanging) {
				this.slidesState.transitionTimer += (90 - this.slidesState.transitionTimer) * 0.1;

				if (this.slidesState.transitionTimer >= 88.5 && this.slidesState.transitionTimer !== 90) {
					this.slidesState.transitionTimer = 90;
				}
			}

			this.multiTexturesPlane.uniforms.transitionTimer.value = this.slidesState.transitionTimer;
		});
	}

	arrowEvent (activeTexture, nextTexture) {
		this.slidesState.navs.forEach(nav => {
			nav.addEventListener('click', event => {

				const to = event.target.getAttribute('data-goto');
				this._animate(to, activeTexture, nextTexture)

			})
		})
	}

	keyboardEvent (activeTexture, nextTexture) {
		const that = this
		document.addEventListener('keyup', event => {
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
		})
	}

	wheelEvent (activeTexture, nextTexture) {
		const that = this
		this.planeElement.addEventListener('wheel', event => {
			let to = undefined
			if (event.deltaY > 0) {
				to = 'next'
			} else if (event.deltaY < 0) {
				to = 'prev'
			}

			that._animate(to, activeTexture, nextTexture)
		})
	}

	touchEvent () {
		this.planeElement.addEventListener('touchstart', this._handleTouchStart.bind(this), false)
		this.planeElement.addEventListener('touchend', this._handleTouchEnd.bind(this), false)
	}

	_animateProgressBar () {
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
		console.log('this.slidesState.value :>> ', this.slidesState.value);
		if (this.slidesState.value !== this.slidesState.steps) requestAnimationFrame(() => this._animateProgressBar());
	}

	_animate (to, activeTexture, nextTexture) {
		if (!this.slidesState.isChanging && to) {

			this.curtains.enableDrawing()

			this.slidesState.isChanging = true;

			this._navigationDirection(to);
			this.slidesState.steps = Math.ceil((100 / this.slidesState.maxTextures) * this.slidesState.nextTextureIndex)
			requestAnimationFrame(() => this._animateProgressBar())

			nextTexture.setSource(this.multiTexturesPlane.images[this.slidesState.nextTextureIndex]);

			setTimeout(() => {

				this.curtains.disableDrawing();

				this.slidesState.isChanging = false;
				this.slidesState.activeTextureIndex = this.slidesState.nextTextureIndex;

				activeTexture.setSource(this.multiTexturesPlane.images[this.slidesState.activeTextureIndex]);

				this.slidesState.transitionTimer = 0;

			}, 600);
		}
	}

	_navigationDirection (to) {
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

	_handleTouchStart (event) {
    this.touchStartX = event.touches[0].pageX
  }

  _handleTouchEnd (event) {
		const moveX = event.changedTouches[event.changedTouches.length-1].pageX - this.touchStartX
    if (moveX < -10) this.slidesState.navs[0].click()
    else if (moveX > 10) this.slidesState.navs[1].click()
  }

	error () {
		document.body.classList.add("no-curtains", "image-1");

		this.slidesState.navs.forEach(nav => {
			nav.addEventListener("click", event => {
				const to = event.target.getAttribute('data-goto');
				this._navigationDirection(to);

				document.body.classList.remove("image-1", "image-2", "image-3", "image-4");
				document.body.classList.add("image-" + this.slidesState.nextTextureIndex);

				this.slidesState.activeTextureIndex = this.slidesState.nextTextureIndex;

			});
		})
	}

	restoreContext () {
		this.curtains.restoreContext();
	}

	// Not necesary, only for change Displacements Texture
	removePlanes () {
		this.slidesState.value = 16
		this.curtains.dispose();
	}

}

window.addEventListener("load", () => {
	const wrapper = document.querySelector('.wrapper')
	const canvas = wrapper.querySelector('.canvas')
	const planeElement = wrapper.querySelector('.multi-textures')
	const navs = wrapper.querySelectorAll('[data-goto]')
	const progress = wrapper.querySelector('.progress')
	let slide = new WebglSlides({
		canvas,
		planeElement,
		navs,
		progress
	})

	// Down, not necesary, only for change Displacements Texture
	document.querySelector('.js-open-modal').addEventListener('click', () => {
    document.body.classList.add('modal-active')
  })
  document.querySelector('.js-close-modal').addEventListener('click', () => {
    document.body.classList.remove('modal-active')
	})

	const settings = document.querySelectorAll('[data-setting]');
	settings.forEach(setting => {
		setting.addEventListener('click', event => {
			const target = event.target;
			const path = target.getAttribute('src')
			settings.forEach(setting => setting.classList.remove('active'))
			target.classList.add('active')
			document.querySelector('[data-sampler]').src = path
			progress.value = 16

			slide.removePlanes()
			slide = new WebglSlides({
				canvas,
				planeElement,
				navs
			})
		})
	})
});
