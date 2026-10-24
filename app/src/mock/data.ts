// Alle Inhalte sind fiktive Demo-Daten. Sie dürfen nie als echte Stellen, Löhne oder Partnerangebote erscheinen.
import { limitValue } from '@headroom/core';

const cities = ['Frankfurt', 'Berlin', 'Hamburg', 'München'];
const titles = ['Eventaufbau', 'Café-Service', 'Lager / Kommissionierung', 'Einzelhandel'];
const minimumWage = limitValue('minimumWage');
const dateAfter = (days: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

export const demoListings = Array.from({ length: 40 }, (_, index) => ({
  id: 'demo-' + (index + 1),
  city: cities[index % cities.length],
  title: titles[index % titles.length],
  date: dateAfter((index % 14) + 1),
  hourlyWage: [minimumWage, minimumWage + 1.1, minimumWage + 2.1, minimumWage + 0.9][index % 4],
  hours: [3, 4, 6, 8][index % 4],
  demo: true,
}));

export const demoPeerRows = Array.from({ length: 32 * cities.length * 25 }, (_, index) => {
  const group = Math.floor(index / 25);
  const jobPreset = group % 32;
  const city = Math.floor(group / 32);
  return {
    jobPresetId: 'preset-' + jobPreset,
    city: cities[city],
    hourlyWage: 13.9 + (index % 12) * 0.4,
    expectedWage: 15 + (index % 10) * 0.5,
    month: '2026-' + String((index % 12) + 1).padStart(2, '0'),
    demo: true,
  };
});

export const demoPartners = [
  { name: 'ELSTER', category: 'Steuererklärung', url: 'https://www.elster.de/', fictional: false },
  { name: 'TaxLeaf', category: 'Steuer-App', url: '#', fictional: true },
  { name: 'HealthCompare', category: 'Krankenversicherungsvergleich', url: '#', fictional: true },
  { name: 'SafeCover', category: 'Haftpflichtversicherung', url: '#', fictional: true },
  { name: 'Advisor Map', category: 'Steuerberaterverzeichnis', url: '#', fictional: true },
];
