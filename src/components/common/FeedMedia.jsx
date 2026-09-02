import React from 'react';
import { Image } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

// Renders a feed item's media: a looping video if `video` is set, otherwise the
// photo. `style` is applied to whichever is shown. Renders nothing if neither.
const FeedVideo = ({ uri, style }) => {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; });
  return <VideoView player={player} style={style} contentFit="cover" nativeControls />;
};

const FeedMedia = ({ photo, video, style }) => {
  if (video) return <FeedVideo uri={video} style={style} />;
  if (photo) return <Image source={{ uri: photo }} style={style} resizeMode="cover" />;
  return null;
};

export default FeedMedia;
