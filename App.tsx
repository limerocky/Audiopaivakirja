import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Button } from 'react-native-paper';

interface Merkinta {
  id: number;
  timestamp: string;
  audioUrl: string;
}

const db : SQLite.SQLiteDatabase = SQLite.openDatabase('paivakirja.db');

db.transaction(
  (tx : SQLite.SQLTransaction) => {
    tx.executeSql(`CREATE TABLE IF NOT EXISTS paivakirja (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      audioUrl TEXT NOT NULL
    )`);
  }, 
  (err : SQLite.SQLError) => console.error(err) 
);

const App : React.FC = () : React.ReactElement => {
  const [paivakirja, setPaivakirja] = useState<Merkinta[]>([]);
  const [recording, setRecording] = useState<Audio.Recording>();
  const [sound, setSound] = useState<Audio.Sound>();

  const haePaivakirja = () : void => {

    db.transaction(
      (tx : SQLite.SQLTransaction) => {
        tx.executeSql(`SELECT * FROM paivakirja ORDER BY timestamp DESC`, [],
          (_tx : SQLite.SQLTransaction, rs : SQLite.SQLResultSet) => {
            setPaivakirja(rs.rows._array);
          }
        );
      },
      (err : SQLite.SQLError) => console.error(err)
    );
  }

  const startRecoding = async () => {

    try {

      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync( 
        Audio.RecordingOptionsPresets.HIGH_QUALITY 
      );
      setRecording(recording);
    } 
    catch (err : any) {
      console.error('Failed to start recording', err);
    }
  }

  const stopRecording = async () => {

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
        db.transaction(
          (tx : SQLite.SQLTransaction) => {
            tx.executeSql(`INSERT INTO paivakirja (audioUrl, timestamp) 
                           VALUES (?, datetime('now', 'localtime'))`, [destinationUri],
              (_tx : SQLite.SQLTransaction, rs : SQLite.SQLResultSet) => {
                haePaivakirja();
              }
            );
          },
          (err : SQLite.SQLError) => console.log(err)
        );
      } catch (error) {
        console.error('Error moving recording:', error);
      }
    }
  }

  const playSound = async (uri : string) => {

    if (uri) {

      const { sound } = await Audio.Sound.createAsync( 
        { uri: uri }
      )
      setSound(sound);

      await sound.playAsync();
    }
  }

  useEffect(() => {

    return sound
      ? () => {
          sound.unloadAsync(); 
        }
      : undefined;

  }, [sound]);

  useEffect(() => {

    haePaivakirja();

  }, []);

  return (
    <View style={styles.container}>

      <ScrollView
        style={{ width: '100%', marginTop: 50 }}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {paivakirja.map((merkinta : Merkinta) => {
          return (
            <View 
              style={{ marginTop: 20 }}
              key={merkinta.id}
            >
              <Text>{merkinta.timestamp}</Text>

              <Button 
                mode="outlined"
                onPress={() => playSound(merkinta.audioUrl)}
              >Toista ääntä</Button>

            </View>
          );
        })}
      </ScrollView>

      <Button 
        style={{ margin: 10 }}
        mode="contained"
        onPress={recording ? stopRecording : startRecoding}
      >{recording ? 'Lopeta äänitys' : 'Aloita äänitys'}</Button>

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