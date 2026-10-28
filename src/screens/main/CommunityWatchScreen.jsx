import React from 'react';
import ClubGroupsScreen from './ClubGroupsScreen';

// Community Watch is the Club Groups list filtered to kind = 'watch'.
const CommunityWatchScreen = (props) => <ClubGroupsScreen {...props} kind="watch" />;

export default CommunityWatchScreen;
