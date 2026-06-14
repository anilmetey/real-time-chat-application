import { useState } from 'react';

function Login({ onLoginSuccess }) {
  const [authState, setAuthState] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    const endpoint = authState === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include' // Important for HTTPOnly cookies
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Bir hata oluştu');

      if (authState === 'register') {
        setAuthState('login');
        setSuccessMsg('Kayıt başarılı! Lütfen giriş yapın.');
      } else {
        onLoginSuccess();
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <h1>NexusChat</h1>
      <p>Dosya, Emoji ve Özel Mesajlaşma (DM) Destekli İletişim.</p>
      <form className="login-form" onSubmit={handleAuth}>
        {errorMsg && <div className="error-message">{errorMsg}</div>}
        {successMsg && <div className="success-message">{successMsg}</div>}
        <div className="input-group">
          <label htmlFor="username-input">Kullanıcı Adı</label>
          <input id="username-input" type="text" aria-label="Kullanıcı Adı" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="input-group">
          <label htmlFor="password-input">Şifre</label>
          <input id="password-input" type="password" aria-label="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" aria-label={authState === 'login' ? 'Giriş Yap' : 'Kayıt Ol'} disabled={isLoading}>
          {isLoading ? 'İşleniyor...' : (authState === 'login' ? 'Giriş Yap' : 'Kayıt Ol')}
        </button>
        <p className="toggle-auth">
          {authState === 'login' ? 'Hesabınız yok mu? ' : 'Zaten hesabınız var mı? '}
          <button type="button" className="text-btn" aria-label={authState === 'login' ? 'Kayıt Ol Ekranına Geç' : 'Giriş Ekranına Geç'} onClick={() => { setAuthState(authState === 'login' ? 'register' : 'login'); setErrorMsg(''); setSuccessMsg(''); }}>
            {authState === 'login' ? 'Kayıt Ol' : 'Giriş Yap'}
          </button>
        </p>
      </form>
    </div>
  );
}

export default Login;
