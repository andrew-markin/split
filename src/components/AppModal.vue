<template>
  <div
    v-if="backdropShown"
    class="backdrop pa-6"
    :class="{ opaque: contentShown }"
    @mousedown.self="close"
    @keydown.esc="close"
    tabindex="0">
    <v-slide-y-transition>
    <v-sheet
      v-if="contentShown"
      class="dialog pa-6 rounded-lg"
      elevation="24" max-width="650">
      <div class="text-h5 text-truncate mb-6">
        {{ title }}
      </div>
      <slot></slot>
      <div class="d-flex mt-6">
        <slot name="left-buttons"/>
        <v-spacer></v-spacer>
        <v-btn
          large depressed
          @click="close">
          {{ $t('CLOSE') }}
        </v-btn>
        <slot name="right-buttons"/>
      </div>
    </v-sheet>
    </v-slide-y-transition>
  </div>
</template>

<style>
html[modal="true"] {
  overflow-y: hidden !important;
}
</style>

<style scoped>
.backdrop {
  background-color: rgba(128, 128, 128, 0.3);
  backdrop-filter: blur(5px);
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1000;
  overflow-x: hidden;
  overflow-y: hidden;
  opacity: 0.0;
  transition: opacity 0.15s ease-out;
}
.opaque {
  opacity: 1.0;
  overflow-y: scroll;
}
.dialog {
  margin-top: auto;
  margin-bottom: auto;
  margin-right: auto;
  margin-left: auto;
}
</style>

<script>
// Measure scrollbar width
const scrollDiv = document.createElement('div')
scrollDiv.style.cssText = 'width: 100px; overflow: scroll; position: absolute; top: -9999px;'
document.body.appendChild(scrollDiv)
const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth
document.body.removeChild(scrollDiv)

export default {
  props: {
    title: String,
    value: Boolean
  },
  emits: ['input', 'closed'],
  data: () => ({
    ready: false
  }),
  computed: {
    backdropShown () {
      return this.value || this.ready
    },
    contentShown () {
      return this.value && this.ready
    }
  },
  watch: {
    value (value) {
      clearTimeout(this.readyTimeout)
      this.readyTimeout = setTimeout(() => {
        this.ready = value
      }, value ? 0 : 200)
    },
    contentShown (value) {
      const padding = value ? `${scrollbarWidth}px` : ''
      document.documentElement.setAttribute('modal', value)
      document.documentElement.style['padding-right'] = padding
      const headerElements = document.getElementsByTagName('header')
      for (const headerElement of headerElements) {
        headerElement.style['padding-right'] = padding
      }
    },
    backdropShown (value) {
      if (!value) this.$emit('closed')
    }
  },
  methods: {
    handleKeyPress (event) {
      if (this.value && (event.which === 27)) this.close()
    },
    close () {
      this.$emit('input', undefined)
    }
  },
  created () {
    window.addEventListener('keydown', this.handleKeyPress)
  },
  beforeDestroy () {
    window.removeEventListener('keydown', this.handleKeyPress)
  }
}
</script>
