// ============================================================
// HeroBanner — vanilla custom element for the hero slideshow
//
// Responsibilities:
//   • Crossfade between slides (.is-active) with .animate-in
//     replaying entrance animations on every transition
//   • Arrow + dot navigation; touch/swipe (40 px threshold)
//   • Autoplay with pause-on-hover, visibilitychange, and
//     Shopify.designMode guards
//   • Full cleanup in disconnectedCallback
// ============================================================
class HeroBanner extends HTMLElement {
  connectedCallback() {
    this._slides = [...this.querySelectorAll('.hero-banner__slide')]
    this._dots   = [...this.querySelectorAll('.hero-banner__dot')]
    this._prev   = this.querySelector('.hero-banner__arrow--prev')
    this._next   = this.querySelector('.hero-banner__arrow--next')

    // Single slide — controls not needed
    if (this._slides.length <= 1) return

    this._current            = 0
    this._autoplay           = this.dataset.autoplay === 'true'
    this._speed              = parseInt(this.dataset.speed, 10) || 5000
    this._timer              = null
    this._touchStartX        = 0
    this._reducedMotion      = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    this._bindEvents()

    if (this._autoplay && !this._reducedMotion && !window.Shopify?.designMode) {
      this._startAuto()
    }
  }

  disconnectedCallback() {
    this._stopAuto()

    this._prev?.removeEventListener('click', this._onPrev)
    this._next?.removeEventListener('click', this._onNext)
    this.removeEventListener('mouseenter', this._onMouseEnter)
    this.removeEventListener('mouseleave', this._onMouseLeave)
    this.removeEventListener('touchstart', this._onTouchStart)
    this.removeEventListener('touchend', this._onTouchEnd)
    document.removeEventListener('visibilitychange', this._onVisibility)

    if (this._dotHandlers) {
      this._dots.forEach((dot, i) => {
        dot.removeEventListener('click', this._dotHandlers[i])
      })
    }
  }

  // ─── Public API ───────────────────────────────────────────
  goTo(index) {
    const total = this._slides.length
    const next  = (index + total) % total
    if (next === this._current) return

    const prev    = this._current
    this._current = next

    // Outgoing slide
    this._slides[prev].classList.remove('is-active', 'animate-in')
    this._slides[prev].setAttribute('aria-hidden', 'true')
    if (this._dots[prev]) {
      this._dots[prev].classList.remove('is-active')
      this._dots[prev].setAttribute('aria-selected', 'false')
    }

    // Force a reflow so the browser recognises animate-in as a
    // fresh class addition, replaying the keyframe animation
    // even when cycling back to a previously shown slide.
    void this._slides[next].offsetWidth

    // Incoming slide
    this._slides[next].classList.add('is-active', 'animate-in')
    this._slides[next].setAttribute('aria-hidden', 'false')
    if (this._dots[next]) {
      this._dots[next].classList.add('is-active')
      this._dots[next].setAttribute('aria-selected', 'true')
    }
  }

  // ─── Autoplay ─────────────────────────────────────────────
  _startAuto() {
    if (!this._autoplay || this._reducedMotion) return
    this._timer = setInterval(() => this.goTo(this._current + 1), this._speed)
  }

  _stopAuto() {
    clearInterval(this._timer)
    this._timer = null
  }

  _resetAuto() {
    this._stopAuto()
    this._startAuto()
  }

  // ─── Event wiring ─────────────────────────────────────────
  _bindEvents() {
    this._onPrev = () => { this._resetAuto(); this.goTo(this._current - 1) }
    this._onNext = () => { this._resetAuto(); this.goTo(this._current + 1) }
    this._prev?.addEventListener('click', this._onPrev)
    this._next?.addEventListener('click', this._onNext)

    // Store per-dot handlers so they can be removed on disconnect
    this._dotHandlers = this._dots.map((dot) => {
      const handler = () => {
        this._resetAuto()
        this.goTo(parseInt(dot.dataset.index, 10))
      }
      dot.addEventListener('click', handler)
      return handler
    })

    // Pause autoplay while the cursor is over the banner
    this._onMouseEnter = () => this._stopAuto()
    this._onMouseLeave = () => this._startAuto()
    this.addEventListener('mouseenter', this._onMouseEnter)
    this.addEventListener('mouseleave', this._onMouseLeave)

    // Swipe — 40 px horizontal threshold
    this._onTouchStart = (e) => {
      this._touchStartX = e.changedTouches[0].screenX
    }
    this._onTouchEnd = (e) => {
      const diff = this._touchStartX - e.changedTouches[0].screenX
      if (Math.abs(diff) > 40) {
        this._resetAuto()
        this.goTo(diff > 0 ? this._current + 1 : this._current - 1)
      }
    }
    this.addEventListener('touchstart', this._onTouchStart, { passive: true })
    this.addEventListener('touchend',   this._onTouchEnd,   { passive: true })

    // Pause when the tab is hidden; resume when it returns
    this._onVisibility = () => {
      if (document.hidden) this._stopAuto()
      else this._startAuto()
    }
    document.addEventListener('visibilitychange', this._onVisibility)
  }
}

customElements.define('hero-banner', HeroBanner)
