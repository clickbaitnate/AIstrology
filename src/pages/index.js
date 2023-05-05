import { useState } from 'react';
import axios from 'axios';
import styles from 'src/styles/Home.module.css';
import Head from 'next/head';

const Home = () => {
  const [birthData, setBirthData] = useState({
    birth_date: '',
    birth_time: '',
    birth_city: '',
    birth_state_country: '',
  });
  const [results, setResults] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setBirthData({ ...birthData, [e.target.name]: e.target.value });
  };

  const handleApiKeyChange = (e) => {
    const newApiKey = e.target.value;
    localStorage.setItem('API_KEY', newApiKey);
    setApiKey(newApiKey);
  };

  const toggleApiKeyVisibility = () => {
    setShowApiKey(!showApiKey);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post('/api/zodiac', birthData, {
        headers: {
          'X-API-Key': apiKey,
        },
      });
      setResults({
        holisticReading: response.data.holisticReading,
        planetData: response.data.planetData,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
    <div className={styles.container}>
      <h1 className={styles.title}>AI-Strology</h1>
      <br />
      <br />
      <form onSubmit={handleSubmit}>
        <label>
          API Key:
          <input
            type={showApiKey ? 'text' : 'password'}
            name="api_key"
            value={apiKey}
            onChange={handleApiKeyChange}
            required
          />
        </label>
        <button className={styles.myButton} type="button" onClick={toggleApiKeyVisibility}>
          {showApiKey ? 'Hide' : 'Show'}
        </button>
        <br />
        <br />
        <label>
          Birth Date:
          <input type="date" name="birth_date" value={birthData.birth_date} onChange={handleChange} required />
        </label>
        <br />
        <br />
        <label>
          Birth Time:
          <input type="time" name="birth_time" value={birthData.birth_time} onChange={handleChange} required />
        </label>
        <br />
        <br />
        <label>
          Birth City:
          <input type="text" name="birth_city" value={birthData.birth_city} onChange={handleChange} required />
        </label>
        <br />
        <br />
        <label>
          Birth State/Country:
          <input type="text" name="birth_state_country" value={birthData.birth_state_country} onChange={handleChange} required />
        </label>
        <br />
        <br />
        <button className={styles.myButton}  type="submit">Submit</button>
      </form>
      <br />
      {loading && <p>Loading... this may take a moment, grab a coffee.</p>}
      {results && (
      <div>
      <h2>Holistic Reading</h2>
      <p>{results.holisticReading}</p>
      </div>
      )}
    {results &&
    results.planetData &&
    Object.keys(results.planetData)
    .map((planet) => (
      <div key={planet}>
        <br />
        <h3>{planet}</h3>
        <br />
        <h5>In</h5>
        <br />
        <h4>{results.planetData[planet].sign}</h4>
        <br />
        <p>Explanation: {results.planetData[planet].explanation}</p>
      </div>
))}

      </div>
      </div>
    );
  };


export default Home;


