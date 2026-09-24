<template>
  <div class="track-row row items-center" @dblclick="$emit('play', track)">
    <div class="cover flex flex-center">
      <img v-if="coverSrc" :src="coverSrc" :alt="track.title" />
      <q-icon v-else name="music_note" size="22px" />
    </div>

    <div class="meta col ellipsis">
      <div class="title ellipsis">{{ track.title }}</div>
      <div class="artist ellipsis">
        {{ track.artist_name || 'Unknown artist' }}
        <span v-if="track.album_name"> · {{ track.album_name }}</span>
      </div>
    </div>

    <div class="duration gt-xs">{{ formatDuration(track.duration_ms) }}</div>

    <q-btn
      flat
      round
      dense
      :icon="track.liked ? 'favorite' : 'favorite_border'"
      class="like"
      :class="{ on: track.liked }"
      @click.stop="$emit('like', track)"
    />
    <q-btn
      flat
      round
      dense
      icon="play_arrow"
      class="play"
      @click.stop="$emit('play', track)"
    />
    <q-btn
      v-if="showAdd"
      flat
      round
      dense
      icon="playlist_add"
      class="add"
      @click.stop="$emit('add', track)"
    >
      <q-tooltip>Add to playlist</q-tooltip>
    </q-btn>
    <q-btn
      v-if="showRemove"
      flat
      round
      dense
      :icon="removeIcon"
      class="danger"
      @click.stop="$emit('remove', track)"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatDuration, toEngineProxyUrl } from '@/helpers/mediaUrl'

const props = defineProps({
  track: { type: Object, required: true },
  showAdd: { type: Boolean, default: false },
  showRemove: { type: Boolean, default: true },
  removeIcon: { type: String, default: 'delete_outline' },
})

defineEmits(['play', 'remove', 'add', 'like'])

const coverSrc = computed(() => toEngineProxyUrl(props.track.cover_url))
</script>

<style scoped>
.track-row {
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  transition: background 160ms var(--ease-out);
}

.track-row:hover {
  background: var(--mt-bg-panel-hover);
}

.cover {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  overflow: hidden;
  background: linear-gradient(145deg, #1c2030, #0d1018);
  color: var(--mt-text-dim);
  flex-shrink: 0;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.title {
  font-weight: 600;
  font-size: 0.95rem;
}

.artist {
  margin-top: 2px;
  color: var(--mt-text-muted);
  font-size: 0.8rem;
}

.duration {
  color: var(--mt-text-dim);
  font-variant-numeric: tabular-nums;
  font-size: 0.82rem;
  min-width: 48px;
  text-align: right;
}

.like {
  color: var(--mt-text-dim) !important;
}

.like.on {
  color: var(--mt-warm) !important;
}

.play {
  color: var(--mt-accent) !important;
}

.add {
  color: var(--mt-text-muted) !important;
}

.danger {
  color: var(--mt-text-dim) !important;
}

.danger:hover {
  color: #ff8f8f !important;
}
</style>
