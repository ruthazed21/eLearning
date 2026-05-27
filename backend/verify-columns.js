const pool = require('./db/connection');

async function verifyColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'lessons'
      ORDER BY ordinal_position;
    `);
    
    console.log('✅ Lessons table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    const hasExtractedText = result.rows.some(row => row.column_name === 'extracted_text');
    const hasTranscript = result.rows.some(row => row.column_name === 'transcript');
    
    if (hasExtractedText && hasTranscript) {
      console.log('\n✅ Both extracted_text and transcript columns are present!');
    } else {
      console.log('\n⚠️  Missing columns:');
      if (!hasExtractedText) console.log('  - extracted_text');
      if (!hasTranscript) console.log('  - transcript');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error verifying columns:', error.message);
    process.exit(1);
  }
}

verifyColumns();
