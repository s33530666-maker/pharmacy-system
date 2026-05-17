import { getAlternatives } from './alt.service.js';

async function getAlternativesHandler(req, res) {
  try {
    const { drugId } = req.params;

    if (!drugId) {
      return res.status(400).json({
        success: false,
        message: 'Drug ID is required',
      });
    }

    const alternatives = await getAlternatives(drugId);

    return res.status(200).json({
      success: true,
      data: alternatives,
      count: alternatives.length,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
}

export {
  getAlternativesHandler,
};
