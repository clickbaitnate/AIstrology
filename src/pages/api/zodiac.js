import { Configuration, OpenAIApi } from 'openai';
import { DateTime, IANAZone } from 'luxon';
import swisseph from 'swisseph';
import axios from 'axios';

import tzlookup from 'tz-lookup';

swisseph.swe_set_ephe_path('ephe');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const zodiacSign = (longitude) => {
  const signs = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ];
  const index = Math.floor(longitude / 30);
  return signs[index];
};

async function generateExplanation(planet, sign, apiKey) {
  const prompt = `In the voice of an expert astrologer, explain the significance of a person born with the planet ${planet} in the sign of ${sign}.`;

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: `In the voice of an astrologer, give a concise, brutally honest, and straight to the point, personal chart reading for a person born with the planet ${planet} in the sign of ${sign}. Do not give an introduction or waste any time. Give the reading and nothing else. Use 75 words or less.` },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 150,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const result = response.data.choices[0].message.content;
    return result;
  } catch (error) {
    console.error('Error in generateExplanation:', error);
    return "No explanation found. Please try again later.";
  }
}

async function generateHolisticReading(planetSignPairs, apiKey) {
  const structuredPrompts = planetSignPairs
    .map(({ planet, sign }) => `${planet}: ${sign}`)
    .join(', ');

  const prompt = `You are a skilled astrologer. Analyze the following planetary placements and identify the conjunctions, sextiles, squares, trines, and oppositions. After identifying the aspects, explain the effect they have on the person's life. Focus on the aspects and interactions between the planets; do not exceed 200 words.

Planetary placements:
${structuredPrompts}

Remember to keep the explanation concise and focused on the aspects between the planets.`;

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 300,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const result = response.data.choices[0].message.content;
    return result;
  } catch (error) {
    console.error('Error in generateHolisticReading:', error);
    return "No holistic reading found. Please try again later.";
  }
}

async function getCoordinates(location) {
  console.log('Trying to get coordinates for location:', location);
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: location,
        format: 'json',
        limit: 1,
      },
      headers: {
        'User-Agent': 'AI-Strology',
      },
    });

    if (response.data.length === 0) {
      throw new Error('No coordinates found for the given location');
    }

    const { lat, lon } = response.data[0];
    return [parseFloat(lat), parseFloat(lon)];
  } catch (error) {
    console.error('Error in getCoordinates:', error);
    throw error;
  }
}


export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const { birth_date, birth_time, birth_city, birth_state_country } = req.body;

      // Get the user-provided API key from the request header
      const apiKey = req.headers['x-api-key'];
      if (!apiKey) {
        res.status(400).json({ message: 'API key is required' });
        return;
      }

      // Get coordinates based on city and state/country
      const [latitude, longitude] = await getCoordinates(`${birth_city}, ${birth_state_country}`);

      // Get timezone based on latitude and longitude
      const zone = tzlookup(latitude, longitude);
      const dt = DateTime.fromISO(birth_date + 'T' + birth_time, { zone });

      console.log('Parsed birth_date:', birth_date);
      console.log('Parsed birth_time:', birth_time);
      console.log('Parsed dt:', dt);
      
      const birth = {
        year: dt.year,
        month: dt.month,
        day: dt.day,
        hour: dt.hour,
        minute: dt.minute,
        second: dt.second,
        timezone: dt.offset,
        latitude,
        longitude,
      };
      
      console.log('Birth object:', birth);

      const planets = [
        'Sun',
        'Moon',
        'Mercury',
        'Venus',
        'Mars',
        'Jupiter',
        'Saturn',
        'Uranus',
        'Neptune',
        'Pluto',
      ];

      const planetData = {};
      const planetSignPairs = [];

      for (const planet of planets) {
        const planetId = swisseph['SE_' + planet.toUpperCase()];
        const jd = swisseph.swe_julday(birth.year, birth.month, birth.day, parseFloat(birth.hour), swisseph.SE_GREG_CAL);

        console.log(`Calculating position for planet ${planet} (ID: ${planetId}) on Julian Day ${jd}`);

        swisseph.swe_set_topo(longitude, latitude, 0);
        const flag = swisseph.SEFLG_SPEED;

        const planetPosition = await new Promise((resolve) => {
          swisseph.swe_calc_ut(jd, planetId, flag, (body) => {
            console.log(`Planet position object for ${planet}:`, body);
            resolve(body);
          });
        });

        console.log(`Planet: ${planet}`);
        console.log('Planet position object:', planetPosition); // Log the entire planetPosition object

        const sign = zodiacSign(planetPosition.longitude);
        const degrees = planetPosition.longitude % 30;

        console.log(`Planet Longitude: ${planetPosition.longitude}`);
        console.log(`Planet Latitude: ${planetPosition.latitude}`);
        console.log(`Sign: ${sign}`);
        console.log("------");

        // Pass the user-provided API key to the generateExplanation function
        const explanation = await generateExplanation(planet, sign, apiKey);

        planetData[planet] = {
          az: planetPosition.longitude,
          alt: planetPosition.latitude,
          sign,
        };

        planetSignPairs.push({ planet, sign });
      }

      const holisticReading = await generateHolisticReading(planetSignPairs, apiKey);

      for (const planet of planets) {
        const sign = planetData[planet].sign;
        const explanation = await generateExplanation(planet, sign, apiKey);
        planetData[planet].explanation = explanation;
      }

      res.status(200).json({ planetData, holisticReading });
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in handler:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message, stack: error.stack });
  }
}