import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { ROUTES } from '../constants/routes';
import { COLORS } from '../constants/colors';
import HomeScreen from '../screens/main/HomeScreen';
import FriendsScreen from '../screens/main/FriendsScreen';
import SearchUsersScreen from '../screens/main/SearchUsersScreen';

const Tab = createBottomTabNavigator();
const FriendsStack = createNativeStackNavigator();

// Friends stack: Friends list → Search Users
const FriendsStackNavigator = () => (
  <FriendsStack.Navigator screenOptions={{ headerShown: false }}>
    <FriendsStack.Screen name={ROUTES.FRIENDS} component={FriendsScreen} />
    <FriendsStack.Screen name={ROUTES.SEARCH_USERS} component={SearchUsersScreen} />
  </FriendsStack.Navigator>
);

const TabIcon = ({ emoji, focused }) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
);

const MainNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: COLORS.background, borderTopColor: COLORS.border },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textMuted,
    }}
  >
    <Tab.Screen
      name={ROUTES.HOME}
      component={HomeScreen}
      options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />, tabBarLabel: 'Home' }}
    />
    <Tab.Screen
      name="FriendsTab"
      component={FriendsStackNavigator}
      options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} />, tabBarLabel: 'Friends' }}
    />
  </Tab.Navigator>
);

export default MainNavigator;
