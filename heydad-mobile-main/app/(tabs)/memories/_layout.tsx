import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function AuthLayout() {
  return (
    <>
      <StatusBar barStyle="light" backgroundColor="#1e293b" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#ffffff' },
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "index",
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="capture"
          options={{
            title: 'Capture',
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}
