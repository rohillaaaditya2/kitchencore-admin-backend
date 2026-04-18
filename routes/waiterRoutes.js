const express = require('express');
const router = express.Router();
const waiterController = require('../controllers/waiterController');

router.post('/', waiterController.createRequest);
router.get('/', waiterController.getRequests);
router.patch('/:id', waiterController.resolveRequest);

module.exports = router;
