// Test script to simulate all 4 medal states
// Open browser console on http://localhost:4200 and paste this

const testData = {
  byType: {
    'addition': 1250,      // Gold (1000+)
    'subtraction': 650,    // Silver (500-999)
    'multiplication': 150, // Bronze (100-499)
    'division': 47         // None (0-99)
  }
};

localStorage.setItem('schlaufuchs-lifetime-stats', JSON.stringify(testData));
console.log('✅ Test data loaded!');
console.log('➕ Addition: 1250 (🥇 Gold)');
console.log('➖ Subtraktion: 650 (🥈 Silber)');
console.log('× Multiplikation: 150 (🥉 Bronze)');
console.log('÷ Division: 47 (⭕ Keine Medaille)');
console.log('\n🔄 Reload the page to see the medals!');
