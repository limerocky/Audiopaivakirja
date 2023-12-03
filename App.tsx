import { StatusBar } from 'expo-status-bar';
import { Button, StyleSheet, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useEffect, useState } from 'react';

const App : React.FC = () : React.ReactElement => {
  const [recording, setRecording] = useState<Audio.Recording>();
  const [sound, setSound] = useState<Audio.Sound>();

  const startRecoding = async () => {

    try {
      console.log('Requesting permissions..');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync( 
        Audio.RecordingOptionsPresets.HIGH_QUALITY 
      );
      setRecording(recording);
      console.log('Recording started');
    } 
    catch (err : any) {
      console.error('Failed to start recording', err);
    }
  }

  const stopRecording = async () => {

    console.log('Stopping recording..');
    setRecording(undefined);
    await recording?.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    const uri = recording?.getURI();
    console.log('Recording stopped and stored at', uri);

    if (uri) {
      const destinationUri : string = `${FileSystem.documentDirectory}${Date.now()}.m4a`;
      try {
        await FileSystem.moveAsync({
          from: uri,
          to: destinationUri,
        });
        console.log('Recording moved to', destinationUri);
      } catch (error) {
        console.error('Error moving recording:', error);
      }
    }
  }

  const playSound = async () => {

    console.log('Loading Sound');
    const { sound } = await Audio.Sound.createAsync( 
      { uri: 'file:///data/user/0/host.exp.exponent/files/1701620214048.m4a' }
    )
    setSound(sound);

    console.log('Playing Sound');
    await sound.playAsync();
  }

  useEffect(() => {
    return sound
      ? () => {
          console.log('Unloading Sound');
          sound.unloadAsync(); 
        }
      : undefined;
  }, [sound]);

  return (
    <View style={styles.container}>
      <Button 
        title={recording ? 'Stop Recording' : 'Start Recording'}
        onPress={recording ? stopRecording : startRecoding}
      />
      <Button 
        title="Play Sound"
        onPress={playSound}
      />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;