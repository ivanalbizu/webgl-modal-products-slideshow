# Animación de Modal para grid de productos y Slideshow con WebGL

Si usas navegador Safari es posible que no veas correctamente la maquetación, ya que he usado la función clamp() de CSS para hacer ciertas tipografías y paddings más fluido al tamaño de la pantalla

## Ejecutar el código

He usado <a href="https://parceljs.org/getting_started.html" target="_blank" rel="noopener">parceljs</a>. Para arrancarlo es necesario tener parcel instalado. Se puede usar <code>yarn</code> o <code>npm</code>

```bash
yarn global add parcel-bundler
npm install -g parcel-bundler
```

Lanzar parcel

```bash
parcel index.html
```

## Controlar el flujo de las transiciones CSS desde javascript

He creado tres funciones javascript para controlar las animaciones. He creado animaciones simples desde CSS, pero quería tener controlado el flujo de transiciones desde javascript: unas empiezan cuando terminan otras. Para esto existe un evento en javascript que te indica cuando una transición dada es finalizada: <code>transitionend</code>

He partido de este gran artículo <a href="https://surma.dev/things/raf-promise/" target="_blank" rel="noopener">https://surma.dev/things/raf-promise/</a>

Las tres funciones son las siguientes:

```javascript
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

const animate = async (element, stylz, last) => {
	Object.assign(element.style, stylz)
	return transitionEndPromise(element, last).then(_ => requestAnimationFramePromise())
}
```

La primera función hace un <code>return</code> de <code>requestAnimationFrame</code> (rAF)

La segunda función <code>transitionEndPromise</code> devuelve una promesa basada en la finalización del evento <code>transitionend</code> sobre el elemento HTML (pasado como primer parámetro) que queramos animar. La promesa será resuelta cuando la transición de la propiedad CSS (pasada como segundo parámetro) sea finalizada

La última función <code>animate</code> hace uso de las dos funciones anteriores y devuelve la promesa. Esta función es la que usaremos en nuestro código javascript para cada una de las animaciones que queramos realizar

<ul>
  <li>Parámetro <code>element</code>: se trara de un elemento del DOM</li>
  <li>Parámetro <code>stylz</code>*: estilos CSS que queremos animar, pasado como objeto de propiedades-valores. Una de ellas, lógicamente, debe ser la propiedad <code>transition</code> con las transiciones de las propiedades que se quieran animar</li>
  <li>Parámetro <code>last</code>**: la propiedad que queramos escuchar para dar por finlizada la <code>promesa</code>
</ul>

(*) Las transiciones CSS necesitan la definición de un estado inicial y su estado final. La no definición de alguna de las propiedades CSS hará que la promesa no sea resuelta y por tanto el programa se quede parado

(**) Hay que tener precaución con las propiedades <code>short-hand</code> de CSS. Lo explico con ejemplo. Si animamos el <code>background-color</code> desde azul a rojo pero le pasamos como tercer parámetro la propiedad <code>background</code> la promesa no será resuelta ya que la transición no finaliza, en este caso debemos ser exacto y especificar la propiedad <code>background-color</code>. Si miramos el código de la segunda función veremos que <code>if (event.propertyName !== last) return</code> no se produce <code>match</code> entre las propiedades y nunca llega al <code>resolve()</code>

Anticipando un poco sobre lo que voy a hablar. La potencia es enorme, usando <code>async / await</code> puedes encolar una, dos, tres... transiciones a la finalización de una, dos, tres...

## Ejemplo de flujo de transiciones CSS en apertura de modal

Voy a comentar todo el punto anterior mediante ejemplo. Las animaciones del texto del producto y de sus tallas paralizan las transiciones siguientes. Si, ya, realmente no hay más animaciones, pero lo que hago es cambios en el DOM para dar por finalizada la apertura del modal :). Aunque si revisamos más a fondo, veremos que estas dos transiciones no se inician hasta que esté terminada las animación de Imagen de producto <code>await animate(cloneProductImg, {bla bla bla}, 'left')</code>

Antes de empezar

Previamente, para la animación de los textos del producto lo que hago es un <code>split</code> de todo el texto en palabras. Estos nuevos elementos, con color de texto transparente y fondo blanco me sirve para que, modificando sus alturas, dejen ver el texto del producto

La animación de las tallas consiste en un elemento <code>&lt;rect&gt;</code> de SVG al que se le modifica su <code>stroke-dashoffset</code>

### Transición para texto de productos con apertura de Modal

Parto de que ya tenemos en el DOM todas las palabras dentro de <code>&lt;span&gt;</code> y que su ubicación con CSS hace coincidir cada palabra encima de su respectiva

```javascript
const descriptionSpans = [...modal.querySelectorAll('.product__description .text-animation span')]
const descriptionSpanHeight = `${Math.ceil(descriptionSpans[0].getBoundingClientRect().height)}px`
descriptionSpans.forEach(span => span.style.height = descriptionSpanHeight)
```

Guardamos la referencia a los <code>&lt;span&gt;</code> y establecemos la altura de todos para tener un valor inicial de modificación

```javascript
const descriptionSpanPromises = descriptionSpans.map(span => {
  return animate(span, {
    transition: `height ${randomRange(200, 800)}ms linear ${randomRange(10, 1000)}ms`,
    height: `0px`
  }, 'height')
})
```

Recorremos cada uno de los <code>&lt;span&gt;</code> (<code>descriptionSpans</code>) mediante un bucle <code>map</code> para guardar en un array <code>descriptionSpanPromises</code> cada una de las promesas que nos devuelve cada palabra. Más tarde usaremos este array de promesas

A cada palabra le modificamos su altura, desde su valor inicial (el alto normal) hasta su valor final (0px). La duración y el retraso será un números random entre 200ms-800ms y 10ms-1000ms respectívamente

### Transición para Inputs de tallas con apertura de Modal

Antes de empezar con javascript hago inciso con CSS, y quedándome sólo con el trozo CSS que interesa en este punto

```scss
:root {
	--label-w: 36;
	--label-h: 24;
	--dasharray: calc(calc(var(--label-w) * 2) + calc(var(--label-h) * 2))
}
```

Se crean dos variables CSS para la definición del tamaño del Input y una tercera variable para obtener el perímetro que es calculada con los datos ancho y alto anteriores

El objetivo es para que se puedan modificar los tamaños de los Inputs con tan sólo modificar las variables ancho y alto, y que la animación del <code>path</code> del elemento <code>&lt;rect&gt;</code> sea coherente

```scss
.labels {
	.label {
		width: calc(var(--label-w) * 1px);
		height: calc(var(--label-h) * 1px);
		input {
			&:checked ~	.label__checkmark .shape-rect {
				stroke-dashoffset: 0;
			}
			&:focus ~	.label__checkmark .shape-rect {
				fill: rgba(0,0,0,.1);
			}
		}
		&__checkmark {
			width: inherit;
			height: inherit;
			.shape,
			.text {
				width: inherit;
				height: inherit;
			}
			.shape-rect {
				width: inherit;
				height: inherit;
				stroke-dasharray: var(--dasharray);
				stroke-dashoffset: var(--dasharray);
				stroke-width: 1px;
				transition: stroke-dashoffset 1s;
			}
			.text {
				width: 100%;
				height: 100%;
				border: .5px solid rgba(0,0,0,.1);
				transition: color .5s ease .1s;
			}
			&:hover .shape-rect {
				stroke-dashoffset: 0;
			}
		}
	}
}
```

Por herencia los anchos y altos de los hijos de Label serán los mismos. Y el stroke-dasharray del SVG será la suma de todos sus lados para cerrar todo el perímetro

Ahora sí, seguimos con javascript

```javascript
const labels = modal.querySelector('.labels')
const labelSizes = [...labels.querySelectorAll('.label')]
const shapesRect = [...labels.querySelectorAll('.shape-rect')]
const labelInputChecked = modal.querySelector('.labels input:checked')
```

Se obtienen las referencias a los elementos del DOM

```javascript
let delayLabels = 0
let transtionTimeLabels = 800
const labelW = parseInt(window.getComputedStyle(labelSizes[0], null).getPropertyValue('width'), 10)
const labelH = parseInt(window.getComputedStyle(labelSizes[0], null).getPropertyValue('height'), 10)
```

Se crean variables para hacer cálculos de duración y retraso en las transiciones

```javascript
labels.classList.add('labels--animating')
labelInputChecked.checked = false
```

Se añade clase para realizar pequeños ajustes desde CSS y se establece el Input checked como unchecked (para igualar la animación. Cuando termine la transición, se volverá a dejar marcado)

```javascript
const labelSizesPromises = labelSizes.map(label => {
  delayLabels += (labelW/(labelW*2 + labelH*2))*transtionTimeLabels
  return animate(label.querySelector('.shape-rect'), {
    transition: `stroke-dashoffset ${transtionTimeLabels}ms linear ${delayLabels}ms`,
    strokeDashoffset: '0'
  }, 'stroke-dashoffset')
})
```

Igual que en el caso de la animación de palabras del producto, recorremos cada uno de los <code>&lt;label&gt;</code> (<code>labelSizes</code>) con un bucle <code>map</code> para guardar en un array <code>labelSizesPromises</code> cada una de las promesas.

Antes de usar la función <code>animate</code> realizamos cálculos para aplicar retrasos a cada Label <code>delayLabels += (labelW/(labelW * 2 + labelH * 2)) * transtionTimeLabels</code>. Este delay aplicado a cada Label es el necesario para que se inicie el pintado del lado superior cuando la cara superior del Label precedente ya fue terminado de pintar. Como todos los Labels están inicialmente juntos, da la sensación que se está dibujando una linea horizontal contínua. (Es complicado de explicar, si vas a ejecutar el código, prueba a subir el valor a 5 segundos, exagerando :) <code>transtionTimeLabels = 5000</code>. Si quieres seguir exagerando, también puedes hacer los Inputs más grandes cambiando las variables CSS <code>--label-w: 66; --label-h: 44;</code>)

Ahora si, que me entretengo por el camino, vamos a la función <code>animate</code>

Vamos a modificar el valor de la propiedad <code>stroke-dashoffset</code> (lo indicamos como tercer parámetro de la función, para que resuelva la Promesa. Recuerda que si ponemos <code>stroke</code> la promesa nunca será resuelta, por aquello de que no existe como propiedad <code>if (event.propertyName !== last) return</code>).

No hemos necesitado definir desde javascript la longitud inicial de <code>&lt;rect class="shape-rect" /&gt;</code> porque ya lo tenemos definido desde CSS como la suma de todos sus lados
<code><pre>
--label-w: 36;
--label-h: 24;
--dasharray: calc(calc(var(--label-w) * 2) + calc(var(--label-h) * 2));
stroke-dasharray: var(--dasharray);
</pre></code>

### Lo Prometido es deuda ;)

Para las dos animaciones comentadas en los dos puntos anteriores, dijimos que guardábamos en dos Arrays (descriptionSpanPromises y labelSizesPromises) las promesas de <code>transtionend</code>

Sólo tenemos que esperar a que terminen para seguir avanzando

```javascript
await Promise.all([...descriptionSpanPromises, ...labelSizesPromises])
```


## Flujo de transiciones CSS y movimiento de elementos en apertura de modal

La idea es la misma, realizar transición de elementos con la función <code>animate</code> comentado en los casos anteriores, pero añadiendo el movimiento dentro de la pantalla de una posición inicial a otra. Para esto, he creado funciones que me permitan clonar elementos del DOM, con atributos que me han interesado: <code>left, top, width, height, font-size, position, background-size</code>. Se podrían quitar o añadir otros atributos, o incluso refactorizar para hacerlo más "universal"

## Función para punto de partida de la transición

Necesitamos una función más o menos reutilizable para DRY

```javascript
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
```

La función usa tres parámetros:

<ul>
  <li>Parámetro <code>el</code>: elemento DOM que queremos animar</li>
  <li>Parámetro <code>start</code>: elemento DOM que vamos a usar para leer estilos</li>
  <li>Parámetro <code>appendTo</code>: elemento del DOM donde vamos a insertar el nuevo nodo</li>
</ul>

Internamente usamos dos funciones javascript para poder obtener los valores que nos han interesado <code>window.getComputedStyle(el)</code> y <code>.getBoundingClientRect()</code>

## Función para punto final de la transición

```javascript
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
```

Esta función devuelve un objecto con los estilos para la transición

Cuando queramos iniciar la transición, tenemos que hacer la llamada a la función <code>animate(element, stylz, last)</code> siendo su segundo parámetro la función que estamos comentando <code>transitionTo(el, cssTransition)</code>

## Ejemplo de flujo de transiciones CSS y movimientos de elementos en apertura de modal

Estas dos funciones anteriores se han usado como "helper" para las animaciones de las imágenes, título de producto y precio de producto

Voy a comentar el caso de la animación del título

```javascript
const openModal = event => {
  // otro código

  const product = event.target.closest('.product')
  const dataModalID = 'modal' + product.getAttribute('data-modal')
  const modal = document.querySelector('#' + dataModalID)

  // otro código
}
```

Inicialmente necesitamos identificar el producto sobre el que se hace <code>click</code> y obtener su correspondencia con el modal. El atributo <code>data-modal</code> del producto hace referencia con la <code>ID</code> del Modal

```javascript
productState = {
  product,
  title: product.querySelector('.product__title'),
  // otros elementos
}
modalState = {
  modal,
  title: modal.querySelector('.product__title'),
  // otros elementos
}
```

Uso tres objetos para poder tener la referencias del DOM del producto Modal abierto y poder acceder fácilmente en el cierre del modal que se trate. En el código sólo muestro dos objetos, el tercero, es para guardar las referencias a las instancias creadas del contexto WebGL

Construimos los objetos con las referencias al DOM

```javascript
const cloneProductTitle = productState.title.cloneNode(true)
transtionFrom(cloneProductTitle, productState.title, product)
```

Clonamos el título y lo insertamos dentro del DOM con los estilos de partida que necesitamos dentro del <code>&lt;div</code> del producto

```javascript
animate(cloneProductTitle, transitionTo(modalState.title, 'top .8s ease-in .1s, left .8s ease-in .1s, width .8s ease-in .1s, height .8s ease-in .1s, font-size .8s ease-in .1s'), 'width')
```

Realizamos la animación del producto clonado, con el punto de partida (estilos) que tiene dentro del GRID de productos y con el punto final (estilos) que tiene el título dentro de su Modal, y escuchando el atributo <code>width</code> para dar por finalizada esta transición

Las propiedades que hemos animado son
<ul>
  <li>top .8s ease-in .1s</li>
  <li>left .8s ease-in .1s</li>
  <li>width .8s ease-in .1s</li>
  <li>height .8s ease-in .1s</li>
  <li>font-size .8s ease-in .1s</li>
</ul>

```javascript
animate(cloneProductTitle, {estilos}, 'width')

// Animación que paraliza el código siguiente
await Promise.all([...descriptionSpanPromises, ...labelSizesPromises])

// La eliminación del nodo se ubica después de otras animaciones que si paralizan
cloneProductTitle.remove()
```

Finalmente eliminamos el nodo DOM creado ya que no lo necesitamos para el cierre del Modal

Ojo, podría darse un conflicto al eliminar el nodo, ya que no hemos usado el <code><strong>await</strong> animate(...)</code>, y esto provocaría eliminarlo al poco de iniciar la animación.

Pero no existe peligro, ya que existen animaciones posteriores que si usan <code>await</code> y se ubican antes del <code>.remove()</code> del nodo

## Animación de Imágenes de productos con WebGL

Esta característica es usada en la vista Modal de un producto para mostrar las imágenes relacionadas

Anteriormente hice un <a href="/blog/webgl-slideshow">Slideshow de imágenes con WebGL</a> (ahora con ligeras modificaciones) en un ejemplo aislado, y ahora quería integrarlo para este posible caso de imágenes de productos

A parte de lígeras modificaciones de <code>vertex y fragment shaders</code> que no voy a comentar aquí.

Lo que si he añadido es un elemento HTML <code>&lt;pogress&gt;</code> para mostrar el slide activo

## Indicador de Animación WebGL con progress

```javascript
this.touchStartY = 0
this.countSlides = set.planeElement.querySelectorAll("img").length - 1
this.slidesState = {
  // otros atributos
  progress: set.progress,
  value: set.progress.value,
  next: null
}
```

He añadido nuevos atributos a la clase <code>WebglSlides</code>

<ul>
  <li>Atributo <code>next</code>: usado para saber si se avanza o retrocede de slide</li>
  <li>Atributo <code>value</code>: para poder modificar el valor "value" del elemento <code>&lt;pogress&gt;</code> mediante <code>requestAnimationFrame</code> (rAF)</li>
</ul>

```javascript
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
```

Basándonos en los atributos anteriores, actualizamos el valor del <code>&lt;pogress&gt;</code>

```javascript
_animate(to, activeTexture, nextTexture) {
  if (!this.slidesState.isChanging && to) {
    // otro código

    this.slidesState.steps = Math.ceil((100 / this.slidesState.maxTextures) * this.slidesState.nextTextureIndex)
    requestAnimationFrame(() => this._animateProgressBar())

    // otro código
  }
}
```

La función <code>_animateProgressBar()</code> es llamada dentro de <code>_animate(to, activeTexture, nextTexture)</code>

Realizamos una operación matemática para conocer hasta donde se tiene que producir la llamada a <code>requestAnimationFrame(() => this._animateProgressBar())</code>

Transformamos en escala de 0 a 100 la posición que ocupa la textura siguiente. Cuando se alcance ese valor, el loop será finalizado <code>if (this.slidesState.value !== this.slidesState.steps) requestAnimationFrame(() => this._animateProgressBar())</code>


## Evento wheel para cambio de imágenes WebGL

He registrado un nuevo manejador para los slides, el evento <code>wheel</code> del ratón

```javascript
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
```

Es bastante simple. Aprovecho que ya tenía la navegación mediante botones Prev/Next, en el que detectaba si se pulsa en Prev/Next. Lo que hago es simular este comportamiento en función del valor <code>deltaY</code> asociado al evento <code>wheel</code>, si es mayor a 0: <code>to = 'next'</code> y si es menor de 0: <code>to = 'prev'</code> y hago llamada a la función <code>_animate(to, activeTexture, nextTexture)</code> con el valor del primer parámetro decidido

He comentado sólo algunas cosas, hay más código JS, HTML y CSS en todo el repo