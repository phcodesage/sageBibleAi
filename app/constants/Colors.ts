export interface Theme {
  text: string;
  background: string;
  tint: string;
  tabIconDefault: string;
  tabIconSelected: string;
  verseNumber: string;
  verseBorder: string;
  verseHighlight: string;
  modalBackground: string;
  primary: string;
}

const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

const Colors: { light: Theme; dark: Theme } = {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
    verseNumber: '#B22222',
    verseBorder: '#eee',
    verseHighlight: '#fff3cd',
    modalBackground: 'rgba(0,0,0,0.5)',
    primary: '#2f95dc',
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#666',
    tabIconSelected: tintColorDark,
    verseNumber: '#ff6b6b',
    verseBorder: '#333',
    verseHighlight: '#3a3a2c',
    modalBackground: 'rgba(0,0,0,0.7)',
    primary: '#5fa8dc',
  },
};

export default Colors; 