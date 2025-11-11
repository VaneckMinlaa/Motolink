import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#f4511e',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          title: 'Connexion',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="home"
        options={{
          title: 'Accueil',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="inscription"
        options={{
          title: 'Inscription',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: 'Profil',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="inscription-mototaximan"
        options={{
          title: 'Devenir Mototaximan',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
