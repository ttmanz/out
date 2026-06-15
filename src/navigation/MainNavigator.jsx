import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet } from 'react-native';
import { ROUTES } from '../constants/routes';
import { COLORS } from '../constants/colors';
import { supabase } from '../lib/supabase';
import { getSession } from '../lib/auth';
import { getUnreadNotificationCount } from '../lib/notifications';

import HomeScreen from '../screens/main/HomeScreen';
import WhatHappeningScreen from '../screens/main/WhatHappeningScreen';
import HappeningFeedScreen from '../screens/main/HappeningFeedScreen';
import CreateHappeningScreen from '../screens/main/CreateHappeningScreen';
import WhereToGoScreen from '../screens/main/WhereToGoScreen';
import SpurOfMomentScreen from '../screens/main/SpurOfMomentScreen';
import CreateSpurScreen from '../screens/main/CreateSpurScreen';
import ProfileSettingsScreen from '../screens/main/ProfileSettingsScreen';
import OpenChatScreen from '../screens/main/OpenChatScreen';
import CreateOpenChatScreen from '../screens/main/CreateOpenChatScreen';
import MemberProfileScreen from '../screens/main/MemberProfileScreen';
import NightOutScreen from '../screens/main/NightOutScreen';
import CreateNightOutScreen from '../screens/main/CreateNightOutScreen';
import NightOutDetailScreen from '../screens/main/NightOutDetailScreen';
import FriendsScreen from '../screens/main/FriendsScreen';
import SearchUsersScreen from '../screens/main/SearchUsersScreen';
import MessagesScreen from '../screens/main/MessagesScreen';
import ChatScreen from '../screens/main/ChatScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const FriendsStack = createNativeStackNavigator();
const MessagesStack = createNativeStackNavigator();
const NotificationsStack = createNativeStackNavigator();

const HomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name={ROUTES.HOME} component={HomeScreen} />
    <HomeStack.Screen name={ROUTES.WHAT_HAPPENING} component={WhatHappeningScreen} />
    <HomeStack.Screen name={ROUTES.HAPPENING_FEED} component={HappeningFeedScreen} />
    <HomeStack.Screen name={ROUTES.CREATE_HAPPENING} component={CreateHappeningScreen} />
    <HomeStack.Screen name={ROUTES.WHERE_TO_GO} component={WhereToGoScreen} />
    <HomeStack.Screen name={ROUTES.SPUR_OF_MOMENT} component={SpurOfMomentScreen} />
    <HomeStack.Screen name={ROUTES.CREATE_SPUR} component={CreateSpurScreen} />
    <HomeStack.Screen name={ROUTES.PROFILE_SETTINGS} component={ProfileSettingsScreen} />
    <HomeStack.Screen name={ROUTES.OPEN_CHAT} component={OpenChatScreen} />
    <HomeStack.Screen name={ROUTES.CREATE_OPEN_CHAT} component={CreateOpenChatScreen} />
    <HomeStack.Screen name={ROUTES.MEMBER_PROFILE} component={MemberProfileScreen} />
    <HomeStack.Screen name={ROUTES.NIGHT_OUT} component={NightOutScreen} />
    <HomeStack.Screen name={ROUTES.CREATE_NIGHT_OUT} component={CreateNightOutScreen} />
    <HomeStack.Screen name={ROUTES.NIGHT_OUT_DETAIL} component={NightOutDetailScreen} />
  </HomeStack.Navigator>
);

const FriendsStackNavigator = () => (
  <FriendsStack.Navigator screenOptions={{ headerShown: false }}>
    <FriendsStack.Screen name={ROUTES.FRIENDS} component={FriendsScreen} />
    <FriendsStack.Screen name={ROUTES.SEARCH_USERS} component={SearchUsersScreen} />
    <FriendsStack.Screen name={ROUTES.MEMBER_PROFILE} component={MemberProfileScreen} />
    <FriendsStack.Screen name={ROUTES.CHAT} component={ChatScreen} />
  </FriendsStack.Navigator>
);

const MessagesStackNavigator = () => (
  <MessagesStack.Navigator screenOptions={{ headerShown: false }}>
    <MessagesStack.Screen name={ROUTES.MESSAGES} component={MessagesScreen} />
    <MessagesStack.Screen name={ROUTES.CHAT} component={ChatScreen} />
    <MessagesStack.Screen name={ROUTES.MEMBER_PROFILE} component={MemberProfileScreen} />
  </MessagesStack.Navigator>
);

const NotificationsStackNavigator = () => (
  <NotificationsStack.Navigator screenOptions={{ headerShown: false }}>
    <NotificationsStack.Screen name={ROUTES.NOTIFICATIONS} component={NotificationsScreen} />
  </NotificationsStack.Navigator>
);

const TabIcon = ({ emoji, label, focused }) => (
  <View style={tabStyles.iconWrap}>
    <Text style={[tabStyles.emoji, { opacity: focused ? 1 : 0.45 }]}>{emoji}</Text>
    <Text style={[tabStyles.label, { color: focused ? COLORS.primary : COLORS.textMuted }]}>
      {label}
    </Text>
  </View>
);

const tabStyles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 22 },
  label: { fontSize: 10, fontWeight: '600', marginTop: 2 },
});

const MainNavigator = () => {
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    let channel;
    getSession().then(({ data: { session } }) => {
      if (!session) return;
      const uid = session.user.id;
      getUnreadNotificationCount(uid).then(({ count }) => setNotifCount(count ?? 0));
      channel = supabase
        .channel('notif_badge')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${uid}`,
        }, () => setNotifCount((c) => c + 1))
        .subscribe();
    });
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 0,
          shadowColor: COLORS.black,
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 10,
          height: 62,
          paddingBottom: 6,
          paddingTop: 6,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="FriendsTab"
        component={FriendsStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" label="Friends" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" label="Messages" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsStackNavigator}
        listeners={() => ({
          tabPress: () => setNotifCount(0),
        })}
        options={{
          tabBarIcon: ({ focused }) => (
            <View>
              <TabIcon emoji="🔔" label="Alerts" focused={focused} />
              {notifCount > 0 && (
                <View style={{
                  position: 'absolute', top: -2, right: -6,
                  backgroundColor: COLORS.error,
                  borderRadius: 9, minWidth: 18, height: 18,
                  justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
                }}>
                  <Text style={{ color: COLORS.white, fontSize: 10, fontWeight: '700' }}>
                    {notifCount > 99 ? '99+' : notifCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
