<template>
  <div class="background-pattern" aria-hidden="true"></div>
</template>

<style scoped lang="scss">
// The tile is used as a mask, so its color follows the theme. The layer fills
// its positioned parent, the content placed after it should be positioned too
.background-pattern {
  --pattern-color: #{rgba($grey-8, 0.06)};
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-color: var(--pattern-color);
  mask: url('/pattern.svg') 0 0 / 480px 480px repeat;
  .body--dark & {
    --pattern-color: #{rgba($grey-5, 0.035)};
  }
}
</style>
