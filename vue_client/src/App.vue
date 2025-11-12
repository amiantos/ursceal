<template>
  <div id="app">
    <RouterView />
    <ToastContainer />
  </div>
</template>

<script setup>
import ToastContainer from './components/ToastContainer.vue'
</script>

<style scoped>
/* No app-level styles needed, router views handle their own layouts */
</style>
