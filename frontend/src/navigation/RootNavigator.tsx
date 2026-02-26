import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Platform } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { LoadingOverlay } from '../components/common';
import { COLORS, FONTS } from '../theme';

// Auth screens
import { LoginScreen, RegisterScreen } from '../screens/AuthScreens';

// App screens
import { HomeScreen } from '../screens/HomeScreen';
import { PendingScreen } from '../screens/PendingScreen';
import { CreatePandalScreen } from '../screens/CreatePandalScreen';
import { PandalDetailScreen } from '../screens/PandalDetailScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const AuthStack = createNativeStackNavigator();
const MainTab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const PendingStack = createNativeStackNavigator();

function HomeStackNavigator() {
    return (
        <HomeStack.Navigator screenOptions={{ headerShown: false }}>
            <HomeStack.Screen name="HomeList" component={HomeScreen} />
            <HomeStack.Screen name="PandalDetail" component={PandalDetailScreen} />
            <HomeStack.Screen name="CreatePandal" component={CreatePandalScreen} />
        </HomeStack.Navigator>
    );
}

function PendingStackNavigator() {
    return (
        <PendingStack.Navigator screenOptions={{ headerShown: false }}>
            <PendingStack.Screen name="PendingList" component={PendingScreen} />
            <PendingStack.Screen name="PandalDetail" component={PandalDetailScreen} />
        </PendingStack.Navigator>
    );
}

function MainTabs() {
    return (
        <MainTab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: COLORS.tabActive,
                tabBarInactiveTintColor: COLORS.tabInactive,
                tabBarLabelStyle: styles.tabLabel,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: string;
                    if (route.name === 'Pandals') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Pending') {
                        iconName = focused ? 'time' : 'time-outline';
                    } else {
                        iconName = focused ? 'person' : 'person-outline';
                    }
                    return <Ionicons name={iconName as any} size={22} color={color} />;
                },
            })}
        >
            <MainTab.Screen
                name="Pandals"
                component={HomeStackNavigator}
                options={{ tabBarLabel: 'Pandals' }}
            />
            <MainTab.Screen
                name="Pending"
                component={PendingStackNavigator}
                options={{ tabBarLabel: 'Pending' }}
            />
            <MainTab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ tabBarLabel: 'Profile' }}
            />
        </MainTab.Navigator>
    );
}

function AuthNavigator() {
    return (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthStack.Screen name="Login" component={LoginScreen} />
            <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
    );
}

export const RootNavigator = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) return <LoadingOverlay message="Starting app..." />;

    return (
        <NavigationContainer>
            {isAuthenticated ? <MainTabs /> : <AuthNavigator />}
        </NavigationContainer>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: COLORS.bgCard,
        borderTopColor: COLORS.border,
        borderTopWidth: 1,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 24 : 8,
        height: Platform.OS === 'ios' ? 84 : 64,
    },
    tabLabel: {
        fontSize: FONTS.sizes.xs,
        fontWeight: '600',
    },
});
