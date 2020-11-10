import { Curtains, Plane } from 'curtainsjs';
import fragment from './shaders/fragment-02.glsl'
import vertex from './shaders/vertex-02.glsl'

class WebglSlides {
	constructor(set) {
		this.canvas = set.canvas

		this.planeElement = set.planeElement
		this.multiTexturesPlane = null
		this.slidesState = {
			activeTextureIndex: 1,
			nextTextureIndex: null,
			maxTextures: set.planeElement.querySelectorAll("img").length - 1, // -1 to displacement
			navs: set.navs,

			isChanging: false,
			transitionTimer: 0,
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

				this.initEvent(activeTexture, nextTexture)

			})
	}

	update() {
		this.multiTexturesPlane.onRender(() => {
			if (this.slidesState.isChanging) {
					this.slidesState.transitionTimer = (1 - 0.05) * this.slidesState.transitionTimer + 0.05 * 60;

					if(this.slidesState.transitionTimer >= 59 && this.slidesState.transitionTimer !== 60) {
							this.slidesState.transitionTimer = 60;
					}
			}

			this.multiTexturesPlane.uniforms.transitionTimer.value = this.slidesState.transitionTimer;
		});
	}

	initEvent(activeTexture, nextTexture) {
		this.slidesState.navs.forEach(nav => {
			nav.addEventListener('click', event => {

				if (!this.slidesState.isChanging) {
					this.curtains.enableDrawing()

					this.slidesState.isChanging = true;

					const to = event.target.getAttribute('data-goto');
					this.navigationDirection(to);

					nextTexture.setSource(this.multiTexturesPlane.images[this.slidesState.nextTextureIndex]);

					setTimeout(() => {

						this.curtains.disableDrawing();

						this.slidesState.isChanging = false;
						this.slidesState.activeTextureIndex = this.slidesState.nextTextureIndex;

						activeTexture.setSource(this.multiTexturesPlane.images[this.slidesState.activeTextureIndex]);

						this.slidesState.transitionTimer = 0;

					}, 1700);
				}
			})
		})
	}

	navigationDirection(to) {
		if (to == 'next') {
			if (this.slidesState.activeTextureIndex < this.slidesState.maxTextures) {
				this.slidesState.nextTextureIndex = this.slidesState.activeTextureIndex + 1
			} else {
				this.slidesState.nextTextureIndex = 1
			}
		} else {
			if (this.slidesState.activeTextureIndex <= 1) {
				this.slidesState.nextTextureIndex = this.slidesState.maxTextures
			} else {
				this.slidesState.nextTextureIndex = this.slidesState.activeTextureIndex - 1
			}
		}
	}

	error() {
		document.body.classList.add("no-curtains", "image-1");

		this.slidesState.navs.forEach(nav => {
			nav.addEventListener("click", event => {
				const to = event.target.getAttribute('data-goto');
				navigationDirection(to);

				document.body.classList.remove("image-1", "image-2", "image-3", "image-4");
				document.body.classList.add("image-" + this.slidesState.nextTextureIndex);

				this.slidesState.activeTextureIndex = this.slidesState.nextTextureIndex;

			});
		})
	}

	restoreContext() {
		this.curtains.restoreContext();
	}

	// Not necesary, only for change Displacements Texture
	removePlanes() {
		this.curtains.dispose();
	}
}

window.addEventListener("load", () => {
	const wrapper = document.querySelector('.wrapper')
	const canvas = wrapper.querySelector('.canvas')
	const planeElement = wrapper.querySelector('.multi-textures')
	const navs = wrapper.querySelectorAll('[data-goto]')
	let slide = new WebglSlides({
		canvas,
		planeElement,
		navs
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

			slide.removePlanes()
			slide = new WebglSlides({
				canvas,
				planeElement,
				navs
			})
		})
	})
});