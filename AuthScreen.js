import React, { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import { useTranslation } from 'react-i18next';

const USERS_KEY = 'localUsers';

// Local-only account flow for this Expo demo. A real release must send passwords
// to a secure server and store only a session token on the device.
export default function AuthScreen({ navigation }) {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [mode, setMode] = useState('login');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const id = userId.trim();
    if (!id || !password) { Alert.alert('입력 확인', '아이디와 비밀번호를 모두 입력해 주세요.'); return false; }
    if (!/^[a-zA-Z0-9_@.-]{2,30}$/.test(id)) { Alert.alert('아이디 확인', '아이디는 2~30자의 영문, 숫자, _, @, ., - 만 사용할 수 있습니다.'); return false; }
    if (password.length < 4) { Alert.alert('비밀번호 확인', '비밀번호는 4자 이상 입력해 주세요.'); return false; }
    if (mode === 'signup' && password !== passwordConfirm) { Alert.alert('비밀번호 확인', '비밀번호 확인이 일치하지 않습니다.'); return false; }
    return true;
  };
  const submit = async () => {
    if (!validate()) return;
    const id = userId.trim();
    setSubmitting(true);
    try {
      const users = JSON.parse((await AsyncStorage.getItem(USERS_KEY)) || '[]');
      if (mode === 'signup') {
        if (users.some((account) => account.userId.toLowerCase() === id.toLowerCase())) throw new Error('이미 사용 중인 아이디입니다.');
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify([...users, { userId: id, password }]));
      } else {
        const account = users.find((item) => item.userId.toLowerCase() === id.toLowerCase() && item.password === password);
        if (!account) throw new Error('아이디 또는 비밀번호가 올바르지 않습니다. 회원가입 후 로그인해 주세요.');
      }
      await signIn(id);
      setPassword(''); setPasswordConfirm('');
      navigation.replace('AppTabs');
    } catch (error) { Alert.alert(mode === 'signup' ? '회원가입 실패' : '로그인 실패', error.message || '잠시 후 다시 시도해 주세요.'); }
    finally { setSubmitting(false); }
  };
  const changeMode = (nextMode) => { setMode(nextMode); setPassword(''); setPasswordConfirm(''); };

  return <SafeAreaView style={styles.safe}><View style={styles.container}><Ionicons name="water" size={64} color="#00B4D8" /><Text style={styles.brand}>{t('common.brand')}</Text><Text style={styles.subtitle}>{mode === 'login' ? t('auth.loginSubtitle') : t('auth.signupSubtitle')}</Text><View style={styles.tabs}><Tab active={mode === 'login'} title={t('common.login')} onPress={() => changeMode('login')} /><Tab active={mode === 'signup'} title={t('common.signup')} onPress={() => changeMode('signup')} /></View><Field icon="person-outline" value={userId} onChangeText={setUserId} placeholder={t('auth.idPlaceholder')} editable={!submitting} returnKeyType="next" /><Field icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder={t('auth.passwordPlaceholder')} secureTextEntry editable={!submitting} returnKeyType={mode === 'signup' ? 'next' : 'done'} onSubmitEditing={mode === 'login' ? submit : undefined} />{mode === 'signup' && <Field icon="checkmark-circle-outline" value={passwordConfirm} onChangeText={setPasswordConfirm} placeholder={t('auth.confirmPasswordPlaceholder')} secureTextEntry editable={!submitting} returnKeyType="done" onSubmitEditing={submit} />}<TouchableOpacity style={[styles.submit, submitting && styles.disabled]} onPress={submit} disabled={submitting}><Text style={styles.submitText}>{submitting ? t('auth.processing') : mode === 'login' ? t('common.login') : t('common.signup')}</Text></TouchableOpacity><TouchableOpacity style={styles.guest} onPress={() => navigation.replace('AppTabs')} disabled={submitting}><Text style={styles.guestText}>{t('common.guest')}</Text></TouchableOpacity></View></SafeAreaView>;
}
function Tab({ active, title, onPress }) { return <TouchableOpacity onPress={onPress} style={[styles.tab, active && styles.tabActive]}><Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text></TouchableOpacity>; }
function Field({ icon, ...props }) { return <View style={styles.field}><Ionicons name={icon} size={19} color="#00B4D8" /><TextInput style={styles.input} placeholderTextColor="#78909C" autoCapitalize="none" autoCorrect={false} {...props} /></View>; }
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#F0FAFC' }, container: { flex: 1, width: '100%', maxWidth: 540, alignSelf: 'center', justifyContent: 'center', padding: 25 }, brand: { color: '#0A192F', fontSize: 31, fontWeight: '900', textAlign: 'center', marginTop: 12 }, subtitle: { color: '#607D8B', textAlign: 'center', marginTop: 8, marginBottom: 22 }, tabs: { flexDirection: 'row', backgroundColor: '#DDEFF4', borderRadius: 13, padding: 4, marginBottom: 10 }, tab: { flex: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 11 }, tabActive: { backgroundColor: '#FFF' }, tabText: { color: '#607D8B', fontWeight: '800' }, tabTextActive: { color: '#075985' }, field: { height: 54, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D9EEF3', borderRadius: 13, paddingHorizontal: 14, alignItems: 'center', flexDirection: 'row', marginTop: 11 }, input: { flex: 1, color: '#0A192F', marginLeft: 9 }, submit: { backgroundColor: '#00B4D8', borderRadius: 14, padding: 17, alignItems: 'center', marginTop: 22 }, disabled: { opacity: 0.6 }, submitText: { color: '#062235', fontWeight: '900', fontSize: 16 }, guest: { alignItems: 'center', padding: 16, marginTop: 8 }, guestText: { color: '#075985', fontWeight: '800' } });
