import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ROUTES } from '../constants/routes';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import PhoneLoginScreen from '../screens/auth/PhoneLoginScreen';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
    <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
    <Stack.Screen name={ROUTES.PHONE_LOGIN} component={PhoneLoginScreen} />
  </Stack.Navigator>
);

export default AuthNavigator;
