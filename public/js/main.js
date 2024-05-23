const randomHue = () => Math.floor(Math.random() * Math.floor(360))
const randomPosition = () => `${ Math.floor(Math.random() * Math.floor(90)) }%`

const createBubbles = (n = 3) => Array(n).fill().forEach((e, i) => {
  const bubble = document.createElement('div')
  document.body.appendChild(bubble)

  const clss = document.createAttribute('class') 
  clss.value = 'bubble'
  bubble.setAttributeNode(clss)
  
  const color = document.createAttribute('style')
  const hsl = () => `hsl(${ randomHue() } 100% 50%)`
  const background = `background: linear-gradient(35deg, ${ hsl() } 0%, ${ hsl() } 100%)`

  color.value = background 
  bubble.setAttributeNode(color)
})

const animateBubbles = () => {
  const bubbles = Array.from(document.getElementsByClassName('bubble'))

  const changePositions = (bubble, i) => {
      bubble.style.top = randomPosition()
      bubble.style.left = randomPosition()
  }
  const move = () => bubbles.forEach(changePositions)

  move()
  setInterval( move, 10000 )
}

window.onload = () => {
 createBubbles(10)
 animateBubbles()
}