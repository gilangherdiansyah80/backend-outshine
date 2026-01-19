const addressService = require("../services/address.service");
const { successResponse, errorResponse } = require("../utils/response.util");

const getAddresses = async (req, res) => {
  try {
    const userId = req.user.id;
    const addresses = await addressService.getAddresses(userId);
    return successResponse(
      res,
      addresses,
      "User addresses retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const addAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, phone, street, city, province, postalCode, isDefault } =
      req.body;

    if (!fullName || !phone || !street || !city) {
      return errorResponse(res, "Missing required fields", 400);
    }

    const newAddress = await addressService.addAddress(userId, {
      fullName,
      phone,
      street,
      city,
      province,
      postalCode,
      isDefault,
    });

    return successResponse(res, newAddress, "Address added successfully", 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const updateAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;
    const addressData = req.body;

    const updatedAddress = await addressService.updateAddress(
      userId,
      addressId,
      addressData,
    );
    return successResponse(res, updatedAddress, "Address updated successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;

    await addressService.deleteAddress(userId, addressId);
    return successResponse(res, null, "Address deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;

    const defaultAddress = await addressService.setDefaultAddress(
      userId,
      addressId,
    );
    return successResponse(
      res,
      defaultAddress,
      "Default address set successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
