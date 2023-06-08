<template>
  <v-fade-transition>
    <v-app :key="$i18n.locale" class="modal-open">
      <v-app-bar
        id="bar"
        app short flat
        color="background">
        <v-container class="d-flex py-0 noselect overflow-x-hidden">
          <v-avatar
            class="mr-3"
            size="32">
            <div id="favicon">
              <object
                type="image/svg+xml"
                data="favicon.svg"
                width="100%"
                height="100%">
              </object>
            </div>
          </v-avatar>
          <div
            id="title"
            class="d-flex align-center text-h5 overflow-x-hidden pr-4"
            @click="setPrefsDialogShown(true)">
            <span class="font-weight-medium mr-2">{{ $t('SPLIT') }}:</span>
            <span
              class="text-truncate"
              :class="{ 'muted-1': !title }">
              {{ title || $t('UNTITLED') }}
            </span>
            <v-badge
              class="ml-2"
              dot offset-y="-6"
              :value="!synced">
            </v-badge>
          </div>
          <v-spacer></v-spacer>
          <v-menu
            transition="slide-y-transition" offset-y
            content-class="rounded-lg" min-width="300">
            <template #activator="{ on, attrs }">
              <v-btn
                depressed class="nominwidth pa-2 ml-2"
                v-bind="attrs" v-on="on">
                <v-icon>{{ mdiMenu }}</v-icon>
              </v-btn>
            </template>
            <app-menu-list></app-menu-list>
          </v-menu>
        </v-container>
      </v-app-bar>
      <prefs-modal/>
      <v-main class="panel">
        <router-view/>
      </v-main>
    </v-app>
  </v-fade-transition>
</template>

<style>
html {
  overflow-x: hidden !important;
  overflow-y: scroll !important;
}
.muted-1 {
  opacity: 0.5;
}
.muted-2 {
  opacity: 0.25;
}
.nominwidth {
  min-width: 0 !important
}
</style>

<style scoped>
#bar {
  border-bottom: 1px solid var(--v-border-base) !important;
}
#favicon {
  --favicon-extent: 32px;
  width: var(--favicon-extent);
  height: var(--favicon-extent);
  min-width: var(--favicon-extent);
  min-height: var(--favicon-extent);
  max-width: var(--favicon-extent);
  max-height: var(--favicon-extent);
  display: inline-block;
}
#title {
  cursor: pointer;
}
</style>

<script>
import { mdiMenu } from '@mdi/js'
import { mapActions, mapGetters, mapMutations } from 'vuex'

import AppMenuList from '@/components/AppMenuList.vue'
import PrefsModal from '@/components/PrefsModal.vue'
import { preferLocale } from '@/i18n'

export default {
  components: {
    AppMenuList,
    PrefsModal
  },
  data: () => ({
    mdiMenu
  }),
  computed: {
    ...mapGetters(['synced', 'getPref']),
    key () {
      return this.$route.params.key
    },
    title () {
      return this.getPref('title')
    }
  },
  watch: {
    key () {
      this.loadSplit()
    },
    title () {
      this.updateTitle()
    },
    '$i18n.locale': function (value) {
      preferLocale(value)
      this.updateTitle()
    },
    '$vuetify.theme.dark': function (value) {
      document.documentElement.setAttribute('dark', value)
    }
  },
  methods: {
    ...mapActions(['load']),
    ...mapMutations(['setPrefsDialogShown']),
    loadSplit () {
      this.load(this.key)
    },
    updateTitle () {
      document.title = `${this.$t('SPLIT')}: ${this.title || this.$t('UNTITLED')}`
    }
  },
  created () {
    this.updateTitle()
  },
  mounted () {
    this.loadSplit()
  }
}
</script>
