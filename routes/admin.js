const express = require("express");
const router = express.Router();
const UserController = require("../api/controller/admin/UserController");
const AuthController = require("../api/controller/admin/AuthController");
const RoleController = require("../api/controller/admin/RoleController");
const OrganizationController = require("../api/controller/admin/OrganizationController");
const { adminAuth } = require("../middleware/adminAuth");
const AwsController = require("../api/controller/admin/AwsController");
const DropdownController = require("../api/controller/admin/DropdownController");
const ProductController = require("../api/controller/admin/ProductController");
const CampaignController = require("../api/controller/admin/CampaignController");
const EmployeeGiftController = require("../api/controller/admin/EmployeeGiftController");
const OrderController = require("../api/controller/admin/OrderController");
const DashboardController = require("../api/controller/admin/DashboardController");

// apis
router.route("/upload/file").put(AwsController.uploadFiles);

// authentication
router.route("/accountLogin").post(AuthController.accountLogin);
router.route("/verifyOtp").post(AuthController.verifyOtp);
router.route("/resendOtp").post(AuthController.resendOtp);
router.route("/islogin").get(AuthController.accountLoginStatus);
router.route("/logout").get(AuthController.logout);

// user routes
router.route("/user/getAll").post(UserController.getAllUser);
router.route("/user/create").post(UserController.createUser);
router.route("/user/get").post(UserController.getUserById);
router.route("/user/update").post(UserController.updateUser);
router.route("/user/delete").post(UserController.deleteUser);

// roles routes
router.route("/role/create").post(RoleController.createRole);
router.route("/role/list").post(RoleController.listRole);
router.route("/role/get").post(RoleController.getRoleById);
router.route("/role/update").put(RoleController.updateRole);
router.route("/role/delete").post(RoleController.deleteRole);

//dropdowns
router
  .route("/dropdown/organization")
  .post(DropdownController.organizationDropdown);

//organization routes
router
  .route("/organization/create")
  .post(OrganizationController.createOrganization);
router
  .route("/organization/edit")
  .post(OrganizationController.editOrganization);
router
  .route("/organization/details")
  .get(OrganizationController.getOrganizationDetails);
router
  .route("/organization/list")
  .post(OrganizationController.listOrganization);
router
  .route("/organization/delete")
  .post(OrganizationController.deleteOrganization);

//products
router.route("/product/create").post(ProductController.createProduct);
router.route("/product/edit").post(ProductController.editProduct);
router.route("/product/details").get(ProductController.getProductDetails);
router.route("/product/list").post(ProductController.listProduct);
router.route("/product/delete").post(ProductController.deleteProduct);

//campaigns
router.route("/campaign/create").post(CampaignController.createCampaign);
router.route("/campaign/edit").post(CampaignController.editCampaign);
router.route("/campaign/details").get(CampaignController.getCampaignDetails);
router.route("/campaign/list").post(CampaignController.listCampaign);
router.route("/campaign/delete").post(CampaignController.deleteCampaign);

// employee giftcard
router
  .route("/gift/validate-token/:token")
  .get(EmployeeGiftController.validateToken);
// router
//   .route("/gift/products/:token")
//   .get(EmployeeGiftController.getCampaignProducts);
router.route("/gift/place-order").post(EmployeeGiftController.placeOrder);

//orders
router.route("/order/create").post(OrderController.createOrder);
router.route("/order/edit").post(OrderController.editOrder);
router.route("/order/details").get(OrderController.getOrderDetails);
router.route("/order/list").post(OrderController.listOrder);
router.route("/order/delete").post(OrderController.deleteOrder);

//dashboard
router.route("/dashboard").post(DashboardController.getDashboard);
module.exports = router;
