import { Stack } from 'expo-router';

export default function KidsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="code-entry" />
      <Stack.Screen name="feed" />
    </Stack>
  );
}
