import React, { useState, useEffect } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { COLORS } from '../../constants/colors';
import { getAdsForPage } from '../../lib/ads';

const AdVideo = ({ uri, style }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <VideoView player={player} style={style} contentFit="cover" nativeControls={false} />;
};

const AdBanner = ({ page }) => {
  const [ads, setAds] = useState([]);

  useEffect(() => {
    getAdsForPage(page).then(({ data, error }) => {
      if (!error && data?.length) setAds(data);
    });
  }, [page]);

  if (!ads.length) return null;

  return (
    <View style={styles.wrapper}>
      {ads.map((ad) => {
        const isVideo = ad.media_type === 'video';
        return (
          <TouchableOpacity
            key={ad.id}
            style={styles.banner}
            activeOpacity={ad.link_url ? 0.8 : 1}
            onPress={() => ad.link_url && Linking.openURL(ad.link_url)}
            disabled={!ad.link_url}
          >
            {isVideo ? (
              <AdVideo uri={ad.image_url} style={styles.media} />
            ) : (
              <Image source={{ uri: ad.image_url }} style={styles.media} resizeMode="cover" />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 28, paddingTop: 10 },
  banner: {
    height: 86,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: COLORS.surface,
  },
  media: { width: '100%', height: '100%' },
});

export default AdBanner;
