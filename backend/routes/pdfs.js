const express = require('express');
const router = express.Router();
const multer = require('multer');
const { client: supabase, configured, bucket } = require('../services/supabaseService');
// NOTE: PDF files currently live in Supabase Storage. Uploading to Google Drive
// instead is supported by `googleDriveService.uploadPdf()` — switch here once a
// Workspace Shared Drive exists and the service account is added as a member.
// The `documents` ledger row is identical either way, so the mobile app is unaffected.

// Generated business PDFs (DO / Invoice / Receipt) are uploaded here and stored
// in Supabase Storage; a row in the `documents` table is the durable record.
// 8 MB is ample for these single-page A4 PDFs.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

// POST /api/pdfs — upload a generated PDF (multipart: file + doc_type, ref_id, doc_number)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!configured || !supabase) {
      return res
        .status(503)
        .json({ success: false, error: 'PDF storage not configured (Supabase).' });
    }

    const { doc_type, ref_id, doc_number } = req.body;
    if (!req.file || !doc_type || !ref_id || !doc_number) {
      return res.status(400).json({
        success: false,
        error: 'Missing file or fields: doc_type, ref_id, doc_number',
      });
    }

    const allowed = ['DO', 'INVOICE', 'RECEIPT'];
    if (!allowed.includes(doc_type)) {
      return res
        .status(400)
        .json({ success: false, error: 'doc_type must be one of DO, INVOICE, RECEIPT' });
    }

    const storagePath = `${doc_type}/${doc_number}.pdf`;

    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(storagePath, req.file.buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });
    if (upErr) {
      console.error('Supabase storage upload failed:', upErr.message);
      return res
        .status(502)
        .json({ success: false, error: 'Upload failed: ' + upErr.message });
    }

    const publicUrl = supabase.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;

    const { data, error: dbErr } = await supabase
      .from('documents')
      .insert({
        doc_type,
        ref_id,
        doc_number,
        storage_path: storagePath,
        public_url: publicUrl,
        content_type: 'application/pdf',
      })
      .select()
      .single();

    if (dbErr) {
      console.error('Supabase documents insert failed:', dbErr.message);
      // File is uploaded even if the row insert failed — return what we have.
      return res.status(201).json({
        success: true,
        data: { doc_type, ref_id, doc_number, storage_path: storagePath, public_url: publicUrl },
      });
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error recording PDF:', error);
    res.status(500).json({ success: false, error: 'Failed to record PDF: ' + error.message });
  }
});

// GET /api/pdfs?type=&refId= — list recorded PDFs, newest first.
router.get('/', async (req, res) => {
  try {
    if (!configured || !supabase) {
      return res.status(200).json({ success: true, data: [] });
    }
    let query = supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (req.query.type) query = query.eq('doc_type', req.query.type);
    if (req.query.refId) query = query.eq('ref_id', req.query.refId);
    const { data, error } = await query;
    if (error) {
      return res
        .status(500)
        .json({ success: false, error: 'Failed to list PDFs: ' + error.message });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error listing PDFs:', error);
    res.status(500).json({ success: false, error: 'Failed to list PDFs: ' + error.message });
  }
});

module.exports = router;
