const { validId, validateDocument, createDocument, updateDocument, deleteDocument, approveDocument } = require('../services/documentWriteService');

async function postDocument(req, res) {
  const data = validateDocument(req.body);
  res.status(201).json({ data: await createDocument(data, req.user?.id) });
}
async function patchDocument(req, res) {
  const id = validId(req.params.id);
  const data = validateDocument(req.body, true);
  res.json({ data: await updateDocument(id, data) });
}
async function removeDocument(req, res) {
  await deleteDocument(validId(req.params.id));
  res.status(204).end();
}
async function approveDoc(req, res) {
  const id = validId(req.params.id);
  const result = await approveDocument(id, req.user);
  res.json({ data: result });
}

module.exports = { postDocument, patchDocument, removeDocument, approveDoc };
