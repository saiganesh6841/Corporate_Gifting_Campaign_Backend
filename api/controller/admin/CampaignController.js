const { returnCode } = require("../../../config/responseCode");
const Campaign = require("../../model/campaign");
const User = require("../../model/User");
const Product = require("../../model/product");
const Organization = require("../../model/organization");
const UtilController = require("../services/UtilController");
const Order = require("../../model/order");
const xlsx = require("xlsx");
const crypto = require("crypto");
const { sendBulkMail } = require("../services/MailService");

const parseEmployeeExcel = (buffer) => {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  return rows;
};

module.exports = {
  createCampaign: async (req, res, next) => {
    try {
      const userId = req.user.userId;

      const {
        campaignName,
        occasion,
        campaignDeadline,
        deliveryWindowStart,
        deliveryWindowEnd,
        budgetPerEmployee,
        message,
        giftingModel,
        organizationId,
        emailTextInformation,
      } = req.body;

      if (!campaignName) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Campaign name is required",
        });
      }
      if (!organizationId) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Organization is required",
        });
      }
      if (!occasion) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Occasion is required",
        });
      }
      if (!budgetPerEmployee || Number(budgetPerEmployee) <= 0) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Budget per employee is required",
        });
      }
      if (
        !giftingModel ||
        !["hr_selected", "employee_choice"].includes(giftingModel)
      ) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Valid gifting model is required",
        });
      }
      if (!req.body.employeeFile) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Employee Excel file is required",
        });
      }

      const parsedProductIds = Array.isArray(req.body.productIds)
        ? req.body.productIds
        : typeof req.body.productIds === "string"
          ? JSON.parse(req.body.productIds)
          : [];

      if (!parsedProductIds || parsedProductIds.length === 0) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "At least one product must be selected",
        });
      }
      if (giftingModel === "hr_selected" && parsedProductIds.length > 1) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "HR Selected model allows only one product",
        });
      }

      // parallel fetch — org + products
      const [org, selectedProducts] = await Promise.all([
        Organization.findById(organizationId, { name: 1 }).lean(),
        Product.find(
          { _id: { $in: parsedProductIds }, active: true },
          {
            name: 1,
            price: 1,
            discountPrice: 1,
            thumbnailImage: 1,
            vendor: 1,
            category: 1,
            brand: 1,
            description: 1,
          },
        ).lean(),
      ]);

      if (selectedProducts.length !== parsedProductIds.length) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "One or more selected products not found",
        });
      }

      const campaignProducts = selectedProducts.map((p) => ({
        product: p._id,
        name: p.name,
        price: p.price,
        discountPrice: p.discountPrice,
        thumbnailImage: p.thumbnailImage,
        vendor: p.vendor,
        category: p.category,
        brand: p.brand,
        description: p.description,
      }));

      // single product for hr_selected
      const hrProduct =
        giftingModel === "hr_selected" ? campaignProducts[0] : null;

      // decode base64 → buffer → parse excel
      const fileBuffer = Buffer.from(req.body.employeeFile, "base64");
      let employeeRows = [];
      try {
        employeeRows = parseEmployeeExcel(fileBuffer);
      } catch (e) {
        console.log("❌ Excel parse error:", e);
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Invalid Excel/CSV file format",
        });
      }

      if (employeeRows.length === 0) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Employee file is empty",
        });
      }

      // create campaign
      const campaign = new Campaign({
        campaignName,
        occasion,
        campaignDeadline: Number(campaignDeadline),
        deliveryWindowStart: Number(deliveryWindowStart),
        deliveryWindowEnd: Number(deliveryWindowEnd),
        budgetPerEmployee: Number(budgetPerEmployee),
        message: message || "",
        giftingModel,
        emailTextInformation: emailTextInformation || "",
        products: campaignProducts,
        organizationId: organizationId,
        hr: userId,
        totalEmployees: employeeRows.length,
        status: "active",
        createdBy: userId,
        updatedBy: userId,
      });

      await campaign.save();
      campaign.campaignId = campaign._id.toString();
      await campaign.save();

      console.log("✅ Campaign created:", campaign._id);

      const now = Math.floor(Date.now() / 1000);
      const BASE_GIFT_URL = "http://13.201.19.72:4000/#/gift";

      const userBulkOps = [];
      let skippedRows = 0;

      // keep parsed employee data for order creation after bulkWrite
      const parsedEmployeeData = [];

      for (const row of employeeRows) {
        const fullName = String(
          row["FullName"] ||
            row["fullName"] ||
            row["Full Name"] ||
            row["name"] ||
            "",
        ).trim();
        const email = String(row["Email"] || row["email"] || "")
          .trim()
          .toLowerCase();
        const mobileNumber = String(
          row["MobileNumber"] ||
            row["mobileNumber"] ||
            row["Mobile"] ||
            row["mobile"] ||
            "",
        ).trim();
        const employeeCode = String(
          row["EmployeeCode"] ||
            row["employeeCode"] ||
            row["Employee Code"] ||
            "",
        ).trim();
        const companyTagId = String(
          row["CompanyTagId"] || row["companyTagId"] || row["CompanyId"] || "",
        ).trim();
        const department = String(
          row["Department"] || row["department"] || "",
        ).trim();
        const designation = String(
          row["Designation"] || row["designation"] || "",
        ).trim();
        const address = String(row["Address"] || row["address"] || "").trim();
        const city = String(row["City"] || row["city"] || "").trim();
        const state = String(row["State"] || row["state"] || "").trim();
        const pincode = String(
          row["PinCode"] || row["pinCode"] || row["pincode"] || "",
        ).trim();

        if (!email && !mobileNumber) {
          skippedRows++;
          console.log("⚠️ Skipping row — no email or mobile:", row);
          continue;
        }

        const linkToken = crypto.randomBytes(32).toString("hex");
        const tokenExpiresAt = now + 7 * 24 * 60 * 60; // 7 days
        const giftLink = `${BASE_GIFT_URL}/${linkToken}`;

        const userFilter = email ? { email } : { mobileNumber };

        userBulkOps.push({
          updateOne: {
            filter: userFilter,
            update: {
              $setOnInsert: {
                fullName,
                email,
                mobileNumber,
                userType: "employee",
                organizationId,
                organizationName: org?.name || "",
                hrId: userId,
                employeeCode,
                companyTagId,
                department,
                designation,
                address,
                city,
                state,
                pincode,
                department,
                password: "",
                active: true,
                createdBy: userId,
                createdAt: now,
              },
              $set: {
                // always refresh these on every campaign upload
                linkToken,
                tokenExpiresAt,
                giftLink,
                lastCampaignId: campaign._id,
                updatedBy: userId,
                updatedAt: now,
              },
            },
            upsert: true,
          },
        });

        // store for later use (order creation / email)
        parsedEmployeeData.push({
          fullName,
          email,
          mobileNumber,
          address,
          city,
          state,
          pincode,
          department,
          linkToken,
          giftLink,
        });
      }

      console.log(
        `✅ Total bulkOps: ${userBulkOps.length} | Skipped: ${skippedRows}`,
      );

      // bulk upsert users
      let bulkResult = null;
      if (userBulkOps.length > 0) {
        bulkResult = await User.bulkWrite(userBulkOps, { ordered: false });
        console.log("✅ bulkWrite result:", {
          inserted: bulkResult.upsertedCount,
          updated: bulkResult.modifiedCount,
          matched: bulkResult.matchedCount,
        });
      }

      // generate userId like ACM00001, ACM00002 for newly inserted employees
      const orgPrefix = (org?.name || "EMP")
        .replace(/[^a-zA-Z]/g, "")
        .substring(0, 3)
        .toUpperCase();

      const lastEmployee = await User.findOne(
        {
          userType: "employee",
          userId: { $regex: `^${orgPrefix}`, $options: "i" },
        },
        { userId: 1 },
      )
        .sort({ userId: -1 })
        .lean();

      let startSequence = 1;
      if (lastEmployee?.userId) {
        const numPart = lastEmployee.userId.replace(
          new RegExp(`^${orgPrefix}`, "i"),
          "",
        );
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed)) startSequence = parsed + 1;
      }

      const newEmployees = await User.find(
        { userId: "", organizationId, userType: "employee", createdAt: now },
        { _id: 1 },
      )
        .sort({ _id: 1 })
        .lean();

      if (newEmployees.length > 0) {
        const employeeIdBulkOps = newEmployees.map((emp, index) => ({
          updateOne: {
            filter: { _id: emp._id },
            update: {
              $set: {
                userId:
                  orgPrefix + String(startSequence + index).padStart(5, "0"),
              },
            },
          },
        }));
        await User.bulkWrite(employeeIdBulkOps, { ordered: true });
        console.log(
          `✅ userId range: ${orgPrefix}${String(startSequence).padStart(5, "0")} → ${orgPrefix}${String(startSequence + newEmployees.length - 1).padStart(5, "0")}`,
        );
      }

      // ── HR SELECTED: auto-place orders for all employees ────────────
      if (giftingModel === "hr_selected" && hrProduct) {
        console.log(
          "📦 HR Selected — auto-placing orders for all employees...",
        );

        // fetch all employees in this campaign (new + existing)
        const excelEmails = parsedEmployeeData
          .map((e) => e.email)
          .filter(Boolean);
        const excelMobiles = parsedEmployeeData
          .map((e) => e.mobileNumber)
          .filter(Boolean);

        const allEmployees = await User.find(
          {
            $or: [
              { email: { $in: excelEmails } },
              // { mobileNumber: { $in: excelMobiles } },
            ],
            userType: "employee",
            active: true,
          },
          {
            _id: 1,
            fullName: 1,
            address: 1,
            city: 1,
            state: 1,
            pincode: 1,
            mobileNumber: 1,
          },
        ).lean();

        console.log(
          `📦 Placing orders for ${allEmployees.length} employees...`,
        );

        const hrProductPrice = hrProduct.discountPrice || hrProduct.price;
        const orderDocs = allEmployees.map((emp) => ({
          organization: organizationId,
          campaign: campaign._id,
          employee: emp._id,
          product: hrProduct.product,
          vendor: hrProduct.vendor,
          productSnapshot: {
            name: hrProduct.name,
            price: hrProduct.price,
            discountPrice: hrProduct.discountPrice || 0,
            thumbnailImage: hrProduct.thumbnailImage || "",
          },
          deliveryAddress: {
            fullName: emp.fullName,
            mobileNumber: emp.mobileNumber || "",
            address: emp.address || "",
            city: emp.city || "",
            state: emp.state || "",
            pincode: emp.pincode || "",
            landmark: "",
          },
          quantity: 1,
          price: hrProductPrice,
          status: "pending",
          active: true,
          createdBy: userId,
          updatedBy: userId,
          createdAt: now,
          updatedAt: now,
        }));

        if (orderDocs.length > 0) {
          const insertedOrders = await Order.insertMany(orderDocs, {
            ordered: false,
          });

          // set orderId = _id.toString() for each order
          const orderIdOps = insertedOrders.map((o) => ({
            updateOne: {
              filter: { _id: o._id },
              update: { $set: { orderId: o._id.toString() } },
            },
          }));
          await Order.bulkWrite(orderIdOps, { ordered: false });

          // update campaign giftsSelected count
          await Campaign.updateOne(
            { _id: campaign._id },
            { $set: { giftsSelected: insertedOrders.length } },
          );

          console.log(`✅ Orders placed: ${insertedOrders.length}`);
        }
      }

      // ── EMPLOYEE CHOICE: generate links + send emails ────────────────
      if (giftingModel === "employee_choice" && emailTextInformation) {
        console.log("📧 Employee Choice — sending gift selection emails...");

        let emailHtmlContent = "";
        try {
          emailHtmlContent = decodeURIComponent(
            escape(
              Buffer.from(emailTextInformation, "base64").toString("binary"),
            ),
          );
        } catch (e) {
          console.log("❌ Failed to decode emailTextInformation:", e.message);
        }

        if (emailHtmlContent) {
          const excelEmails = parsedEmployeeData
            .map((e) => e.email)
            .filter(Boolean);

          const employeesWithEmail = await User.find(
            {
              email: { $in: excelEmails },
              userType: "employee",
              active: true,
            },
            { fullName: 1, email: 1, linkToken: 1, giftLink: 1 },
          ).lean();

          console.log(`📧 Emailing ${employeesWithEmail.length} employees...`);

          const deadlineDate = campaignDeadline
            ? new Date(Number(campaignDeadline) * 1000).toLocaleDateString(
                "en-IN",
                {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                },
              )
            : "";

          const mailList = employeesWithEmail.map((emp) => {
            const giftLink =
              emp.giftLink || `${BASE_GIFT_URL}/${emp?.linkToken}`;

            const resolvedHtml = emailHtmlContent
              .replace(/\{\{OrganizationName\}\}/g, org?.name || "")
              .replace(/\{\{CampaignDeadline\}\}/g, deadlineDate)
              .replace(/\{\{GiftSelectionLink\}\}/g, "");

            const finalHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${campaignName}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f5;padding:30px 0;">
<tr><td align="center">
<table width="650" cellpadding="0" cellspacing="0" border="0"
  style="background:#ffffff;border-radius:10px;overflow:hidden;">
  <tr>
    <td style="background:#0078D4;padding:25px;text-align:center;">
      <h2 style="margin:0;color:#ffffff;font-size:24px;">🎁 ${campaignName}</h2>
      <p style="margin-top:8px;color:#d9ecff;font-size:14px;">${org?.name || ""}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:35px;">
      <p style="margin:0 0 20px 0;font-size:16px;color:#333;">
        Dear <strong>${emp.fullName}</strong>,
      </p>
      <div style="font-size:15px;color:#444;line-height:1.8;">
        ${resolvedHtml}
      </div>
      <div style="margin-top:35px;text-align:center;">
        <a href="${giftLink}" target="_blank"
          style="background:#0078D4;color:#ffffff;padding:15px 35px;text-decoration:none;font-size:16px;font-weight:bold;border-radius:6px;display:inline-block;">
          🎁 Select Your Gift
        </a>
      </div>
      <p style="margin-top:25px;font-size:13px;color:#666;">
        If the button above doesn't work, copy and paste this link:
      </p>
      <p style="word-break:break-all;">
        <a href="${giftLink}" style="color:#0078D4;">${giftLink}</a>
      </p>
    </td>
  </tr>
  <tr>
    <td style="background:#f4f4f4;padding:20px;text-align:center;">
      <p style="margin:0;color:#777;font-size:12px;">
        This link is personal and valid for 7 days. Do not share it with anyone.
      </p>
      <p style="margin-top:10px;color:#999;font-size:12px;">
        © ${new Date().getFullYear()} ${org?.name || "Giftworks"}. All Rights Reserved.
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;

            return {
              to: emp.email,
              subject: `🎁 ${campaignName} — Select Your Gift`,
              html: finalHtml,
            };
          });

          const mailResult = await sendBulkMail(mailList);
          console.log(`📧 Email result:`, mailResult);
        }
      }

      const savedEmployees = await User.find(
        { organizationId, userType: "employee", createdAt: now },
        { fullName: 1, email: 1, userId: 1, giftLink: 1 },
      ).lean();
      console.log("✅ Final employees:", savedEmployees.length);

      let responseCode = returnCode.validSession;
      UtilController.sendSuccess(req, res, next, {
        responseCode,
        message: "Campaign created successfully",
        data: {
          campaignId: campaign._id,
          campaignName: campaign.campaignName,
          totalEmployees: employeeRows.length,
          employeesInserted: bulkResult?.upsertedCount || 0,
          employeesUpdated: bulkResult?.modifiedCount || 0,
          ordersPlaced:
            giftingModel === "hr_selected"
              ? employeeRows.length - skippedRows
              : 0,
          emailsSent:
            giftingModel === "employee_choice"
              ? employeeRows.length - skippedRows
              : 0,
        },
      });
    } catch (err) {
      console.log("❌ err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },
  //   createCampaign: async (req, res, next) => {
  //     try {
  //       const userId = req.user.userId;

  //       const {
  //         campaignName,
  //         occasion,
  //         campaignDeadline,
  //         deliveryWindowStart,
  //         deliveryWindowEnd,
  //         budgetPerEmployee,
  //         message,
  //         giftingModel,
  //         organizationId,
  //         emailTextInformation,
  //       } = req.body;

  //       if (!campaignName) {
  //         return UtilController.sendError(req, res, next, {
  //           responseCode: returnCode.invalidParams,
  //           message: "Campaign name is required",
  //         });
  //       }
  //       if (!organizationId) {
  //         return UtilController.sendError(req, res, next, {
  //           responseCode: returnCode.invalidParams,
  //           message: "Organization is required",
  //         });
  //       }
  //       if (!occasion) {
  //         return UtilController.sendError(req, res, next, {
  //           responseCode: returnCode.invalidParams,
  //           message: "Occasion is required",
  //         });
  //       }
  //       if (!budgetPerEmployee || Number(budgetPerEmployee) <= 0) {
  //         return UtilController.sendError(req, res, next, {
  //           responseCode: returnCode.invalidParams,
  //           message: "Budget per employee is required",
  //         });
  //       }
  //       if (
  //         !giftingModel ||
  //         !["hr_selected", "employee_choice"].includes(giftingModel)
  //       ) {
  //         return UtilController.sendError(req, res, next, {
  //           responseCode: returnCode.invalidParams,
  //           message: "Valid gifting model is required",
  //         });
  //       }
  //       if (!req.body.employeeFile) {
  //         return UtilController.sendError(req, res, next, {
  //           responseCode: returnCode.invalidParams,
  //           message: "Employee Excel file is required",
  //         });
  //       }

  //       const parsedProductIds = Array.isArray(req.body.productIds)
  //         ? req.body.productIds
  //         : typeof req.body.productIds === "string"
  //           ? JSON.parse(req.body.productIds)
  //           : [];

  //       if (!parsedProductIds || parsedProductIds.length === 0) {
  //         return UtilController.sendError(req, res, next, {
  //           responseCode: returnCode.invalidParams,
  //           message: "At least one product must be selected",
  //         });
  //       }
  //       if (giftingModel === "hr_selected" && parsedProductIds.length > 1) {
  //         return UtilController.sendError(req, res, next, {
  //           responseCode: returnCode.invalidParams,
  //           message: "HR Selected model allows only one product",
  //         });
  //       }

  //       // parallel fetch — org + products
  //       const [org, selectedProducts] = await Promise.all([
  //         Organization.findById(organizationId, { name: 1 }).lean(),
  //         Product.find(
  //           { _id: { $in: parsedProductIds }, active: true },
  //           { name: 1, price: 1, discountPrice: 1, thumbnailImage: 1, vendor: 1 },
  //         ).lean(),
  //       ]);

  //       console.log("✅ org fetched:", org);
  //       console.log("✅ selectedProducts fetched:", selectedProducts.length);

  //       if (selectedProducts.length !== parsedProductIds.length) {
  //         return UtilController.sendError(req, res, next, {
  //           responseCode: returnCode.invalidParams,
  //           message: "One or more selected products not found",
  //         });
  //       }

  //       const campaignProducts = selectedProducts.map((p) => ({
  //         product: p._id,
  //         name: p.name,
  //         price: p.price,
  //         discountPrice: p.discountPrice,
  //         thumbnailImage: p.thumbnailImage,
  //         vendor: p.vendor,
  //       }));

  //       // decode base64 → buffer → parse excel
  //       const fileBuffer = Buffer.from(req.body.employeeFile, "base64");
  //       let employeeRows = [];
  //       try {
  //         employeeRows = parseEmployeeExcel(fileBuffer);
  //       } catch (e) {
  //         console.log("❌ Excel parse error:", e);
  //         return UtilController.sendError(req, res, next, {
  //           responseCode: returnCode.invalidParams,
  //           message: "Invalid Excel/CSV file format",
  //         });
  //       }

  //       console.log("✅ employeeRows parsed count:", employeeRows.length);
  //       console.log("✅ first row sample:", employeeRows[0]);

  //       if (employeeRows.length === 0) {
  //         return UtilController.sendError(req, res, next, {
  //           responseCode: returnCode.invalidParams,
  //           message: "Employee file is empty",
  //         });
  //       }

  //       // create campaign
  //       const campaign = new Campaign({
  //         campaignName,
  //         occasion,
  //         campaignDeadline: Number(campaignDeadline),
  //         deliveryWindowStart: Number(deliveryWindowStart),
  //         deliveryWindowEnd: Number(deliveryWindowEnd),
  //         budgetPerEmployee: Number(budgetPerEmployee),
  //         message: message || "",
  //         giftingModel,
  //         emailTextInformation: emailTextInformation || "",
  //         products: campaignProducts,
  //         organization: organizationId,
  //         hr: userId,
  //         totalEmployees: employeeRows.length,
  //         status: "active",
  //         createdBy: userId,
  //         updatedBy: userId,
  //       });

  //       await campaign.save();
  //       campaign.campaignId = campaign._id.toString();
  //       await campaign.save();

  //       console.log("✅ Campaign created:", campaign._id);

  //       const now = Math.floor(Date.now() / 1000);
  //       const userBulkOps = [];
  //       let skippedRows = 0;

  //       for (const row of employeeRows) {
  //         const fullName = String(
  //           row["FullName"] ||
  //             row["fullName"] ||
  //             row["Full Name"] ||
  //             row["name"] ||
  //             "",
  //         ).trim();
  //         const email = String(row["Email"] || row["email"] || "")
  //           .trim()
  //           .toLowerCase();
  //         const mobileNumber = String(
  //           row["MobileNumber"] ||
  //             row["mobileNumber"] ||
  //             row["Mobile"] ||
  //             row["mobile"] ||
  //             "",
  //         ).trim();
  //         const employeeCode = String(
  //           row["EmployeeCode"] ||
  //             row["employeeCode"] ||
  //             row["Employee Code"] ||
  //             "",
  //         ).trim();
  //         const companyTagId = String(
  //           row["CompanyTagId"] || row["companyTagId"] || row["CompanyId"] || "",
  //         ).trim();
  //         const department = String(
  //           row["Department"] || row["department"] || "",
  //         ).trim();
  //         const designation = String(
  //           row["Designation"] || row["designation"] || "",
  //         ).trim();
  //         const address = String(row["Address"] || row["address"] || "").trim();
  //         const city = String(row["City"] || row["city"] || "").trim();
  //         const state = String(row["State"] || row["state"] || "").trim();
  //         const pincode = String(
  //           row["PinCode"] || row["pinCode"] || row["pincode"] || "",
  //         ).trim();

  //         if (!email && !mobileNumber) {
  //           skippedRows++;
  //           console.log("⚠️ Skipping row — no email or mobile:", row);
  //           continue;
  //         }

  //         console.log(
  //           `➡️ Building upsert for: ${fullName} | ${email} | ${mobileNumber}`,
  //         );

  //         const linkToken = crypto.randomBytes(32).toString("hex");
  //         const tokenExpiresAt = now + 7 * 24 * 60 * 60; // 7 days

  //         // prefer email as unique filter, fallback to mobile
  //         const userFilter = email ? { email } : { mobileNumber };

  //         userBulkOps.push({
  //           updateOne: {
  //             filter: userFilter,
  //             update: {
  //               $setOnInsert: {
  //                 fullName,
  //                 email,
  //                 mobileNumber,
  //                 userType: "employee",
  //                 organizationId,
  //                 organizationName: org?.name || "",
  //                 hrId: userId,
  //                 employeeCode,
  //                 companyTagId,
  //                 department,
  //                 designation,
  //                 address,
  //                 city,
  //                 state,
  //                 pincode,
  //                 linkToken,
  //                 tokenExpiresAt,
  //                 password: "",
  //                 active: true,
  //                 createdBy: userId,
  //                 createdAt: now,
  //               },
  //               $set: {
  //                 lastCampaignId: campaign._id,
  //                 updatedBy: userId,
  //                 updatedAt: now,
  //               },
  //             },
  //             upsert: true,
  //           },
  //         });
  //       }

  //       console.log(
  //         `✅ Total bulkOps prepared: ${userBulkOps.length} | Skipped: ${skippedRows}`,
  //       );

  //       // bulk upsert users
  //       let bulkResult = null;
  //       if (userBulkOps.length > 0) {
  //         bulkResult = await User.bulkWrite(userBulkOps, { ordered: false });
  //         console.log("✅ bulkWrite result:", {
  //           inserted: bulkResult.upsertedCount,
  //           updated: bulkResult.modifiedCount,
  //           matched: bulkResult.matchedCount,
  //         });
  //       } else {
  //         console.log("❌ No bulkOps built — check Excel headers");
  //       }

  //       // generate userId like ACM00001, ACM00002 for newly inserted employees
  //       const orgPrefix = (org?.name || "EMP")
  //         .replace(/[^a-zA-Z]/g, "")
  //         .substring(0, 3)
  //         .toUpperCase();

  //       const lastEmployee = await User.findOne(
  //         {
  //           userType: "employee",
  //           userId: { $regex: `^${orgPrefix}`, $options: "i" },
  //         },
  //         { userId: 1 },
  //       )
  //         .sort({ userId: -1 })
  //         .lean();

  //       let startSequence = 1;
  //       if (lastEmployee?.userId) {
  //         const numPart = lastEmployee.userId.replace(orgPrefix, "");
  //         const parsed = parseInt(numPart, 10);
  //         if (!isNaN(parsed)) startSequence = parsed + 1;
  //       }

  //       const newEmployees = await User.find(
  //         { userId: "", organizationId, userType: "employee", createdAt: now },
  //         { _id: 1 },
  //       )
  //         .sort({ _id: 1 })
  //         .lean();

  //       console.log(
  //         `✅ New employees found for userId assignment: ${newEmployees.length}`,
  //       );

  //       if (newEmployees.length > 0) {
  //         const employeeIdBulkOps = newEmployees.map((emp, index) => ({
  //           updateOne: {
  //             filter: { _id: emp._id },
  //             update: {
  //               $set: {
  //                 userId:
  //                   orgPrefix + String(startSequence + index).padStart(5, "0"),
  //               },
  //             },
  //           },
  //         }));
  //         await User.bulkWrite(employeeIdBulkOps, { ordered: true });
  //         console.log(
  //           `✅ userId range: ${orgPrefix}${String(startSequence).padStart(5, "0")} → ${orgPrefix}${String(startSequence + newEmployees.length - 1).padStart(5, "0")}`,
  //         );
  //       }

  //       const savedEmployees = await User.find(
  //         { organizationId, userType: "employee", createdAt: now },
  //         { fullName: 1, email: 1, userId: 1 },
  //       ).lean();
  //       console.log(
  //         "✅ Final employees in DB:",
  //         savedEmployees.length,
  //         savedEmployees,
  //       );

  //       // send emails only for employee_choice model
  //       if (giftingModel === "employee_choice" && emailTextInformation) {
  //         let emailHtmlContent = "";
  //         try {
  //           // ✅ match the frontend encoding — decodeURIComponent(escape(atob()))
  //           emailHtmlContent = decodeURIComponent(
  //             escape(
  //               Buffer.from(emailTextInformation, "base64").toString("binary"),
  //             ),
  //           );
  //         } catch (e) {
  //           console.log("❌ Failed to decode emailTextInformation:", e.message);
  //         }

  //         if (emailHtmlContent) {
  //           //   const employeesWithEmail = await User.find(
  //           //     {
  //           //       organizationId,
  //           //       userType: "employee",
  //           //       createdAt: now,
  //           //       email: { $ne: "" },
  //           //     },
  //           //     { fullName: 1, email: 1, linkToken: 1 },
  //           //   ).lean();
  //           // collect all emails and mobiles from the parsed Excel rows
  //           // this covers BOTH newly created and already existing employees
  //           const excelEmails = employeeRows
  //             .map((r) =>
  //               String(r["Email"] || r["email"] || "")
  //                 .trim()
  //                 .toLowerCase(),
  //             )
  //             .filter(Boolean);

  //           const excelMobiles = employeeRows
  //             .map((r) =>
  //               String(
  //                 r["MobileNumber"] || r["mobileNumber"] || r["Mobile"] || "",
  //               ).trim(),
  //             )
  //             .filter(Boolean);

  //           // fetch all matching users — new or existing — from User collection
  //           const employeesWithEmail = await User.find(
  //             {
  //               $or: [
  //                 { email: { $in: excelEmails } },
  //                 // { mobileNumber: { $in: excelMobiles } },
  //               ],
  //               userType: "employee",
  //               email: { $ne: "" },
  //               active: true,
  //             },
  //             { fullName: 1, email: 1, linkToken: 1 },
  //           ).lean();

  //           console.log(
  //             `📧 Total employees to email (new + existing): ${employeesWithEmail.length}`,
  //           );

  //           const DUMMY_BASE_LINK = "https://giftworks.app/select-gift";

  //           // format campaign deadline as readable date
  //           const deadlineDate = campaignDeadline
  //             ? new Date(Number(campaignDeadline) * 1000).toLocaleDateString(
  //                 "en-IN",
  //                 { day: "2-digit", month: "long", year: "numeric" },
  //               )
  //             : "";

  //           const mailList = employeesWithEmail.map((emp) => {
  //             const giftLink = `${DUMMY_BASE_LINK}`; //?token=${emp.linkToken}

  //             // replace template variables in the editor content
  //             const resolvedHtml = emailHtmlContent
  //               .replace(/\{\{OrganizationName\}\}/g, org?.name || "")
  //               .replace(/\{\{CampaignDeadline\}\}/g, deadlineDate)
  //               //   .replace(/\{\{HRName\}\}/g, req.user?.fullName || "HR Team")
  //               // remove the {{GiftSelectionLink}} placeholder line completely
  //               // so no raw text or escaped HTML leaks into the email
  //               .replace(/\{\{GiftSelectionLink\}\}/g, "");

  //             // wrap in email shell with greeting
  //             //         const finalHtml = `
  //             //     <!DOCTYPE html>
  //             //     <html>
  //             //       <head>
  //             //         <meta charset="UTF-8" />
  //             //         <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  //             //       </head>
  //             //       <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  //             //         <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:30px 0;">
  //             //           <tr>
  //             //             <td align="center">
  //             //               <table width="600" cellpadding="0" cellspacing="0"
  //             //                 style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

  //             //                 <!-- header -->
  //             //                 <tr>
  //             //                   <td style="background:#0078D4;padding:24px 32px;">
  //             //                     <h2 style="color:#fff;margin:0;font-size:22px;">
  //             //                       🎁 ${campaignName}
  //             //                     </h2>
  //             //                     <p style="color:#d0e8ff;margin:4px 0 0;font-size:13px;">
  //             //                       ${org?.name || ""}
  //             //                     </p>
  //             //                   </td>
  //             //                 </tr>

  //             //                 <!-- greeting -->
  //             //                 <tr>
  //             //                   <td style="padding:28px 32px 0;">
  //             //                     <p style="margin:0;font-size:16px;color:#333;">
  //             //                       Dear <strong>${emp.fullName}</strong>,
  //             //                     </p>
  //             //                   </td>
  //             //                 </tr>

  //             //                 <!-- editor content — resolvedHtml is already valid HTML from ReactQuill -->
  //             //                 <tr>
  //             //                   <td style="padding:16px 32px 8px;">
  //             //                     <div style="font-size:15px;color:#444;line-height:1.7;">
  //             //                       ${resolvedHtml}
  //             //                     </div>
  //             //                   </td>
  //             //                 </tr>

  //             //                 <!-- gift selection button — always injected by backend, never from editor -->
  //             //                 <tr>
  //             //                   <td style="padding:8px 32px 28px;">
  //             //                     <table cellpadding="0" cellspacing="0">
  //             //                       <tr>
  //             //                         <td style="border-radius:6px;background:#0078D4;">

  //             //                             href="${giftLink}"
  //             //                             target="_blank"
  //             //                             style="display:inline-block;padding:14px 32px;color:#fff;text-decoration:none;font-weight:bold;font-size:15px;border-radius:6px;font-family:Arial,sans-serif;"
  //             //                           >
  //             //                             Select Your Gift 🎁
  //             //                           </a>
  //             //                         </td>
  //             //                       </tr>
  //             //                     </table>
  //             //                     <p style="margin:10px 0 0;font-size:13px;color:#888;">
  //             //                       Or copy this link:
  //             //                       <a href="${giftLink}" style="color:#0078D4;word-break:break-all;">
  //             //                         ${giftLink}
  //             //                       </a>
  //             //                     </p>
  //             //                   </td>
  //             //                 </tr>

  //             //                 <!-- footer -->
  //             //                 <tr>
  //             //                   <td style="background:#f9f9f9;padding:16px 32px;border-top:1px solid #eee;">
  //             //                     <p style="margin:0;font-size:12px;color:#999;">
  //             //                       This link is personal and valid for 7 days. Do not share it with anyone.
  //             //                     </p>
  //             //                     <p style="margin:4px 0 0;font-size:12px;color:#bbb;">
  //             //                       © ${new Date().getFullYear()} ${org?.name || "Giftworks"}. All rights reserved.
  //             //                     </p>
  //             //                   </td>
  //             //                 </tr>

  //             //               </table>
  //             //             </td>
  //             //           </tr>
  //             //         </table>
  //             //       </body>
  //             //     </html>
  //             //   `;
  //             const finalHtml = `
  // <!DOCTYPE html>
  // <html>
  // <head>
  // <meta charset="UTF-8">
  // <meta name="viewport" content="width=device-width, initial-scale=1.0">
  // <title>${campaignName}</title>
  // </head>

  // <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">

  // <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f5;padding:30px 0;">
  // <tr>
  // <td align="center">

  // <table width="650" cellpadding="0" cellspacing="0" border="0"
  // style="background:#ffffff;border-radius:10px;overflow:hidden;">

  // <tr>
  // <td style="background:#0078D4;padding:25px;text-align:center;">
  // <h2 style="margin:0;color:#ffffff;font-size:24px;">
  // 🎁 ${campaignName}
  // </h2>

  // <p style="margin-top:8px;color:#d9ecff;font-size:14px;">
  // ${org?.name || ""}
  // </p>
  // </td>
  // </tr>

  // <tr>
  // <td style="padding:35px;">

  // <p style="margin:0 0 20px 0;font-size:16px;color:#333;">
  // Dear <strong>${emp.fullName}</strong>,
  // </p>

  // <div style="font-size:15px;color:#444;line-height:1.8;">
  // ${resolvedHtml}
  // </div>

  // <div style="margin-top:35px;text-align:center;">

  // <a
  // href="${giftLink}"
  // target="_blank"
  // style="
  // background:#0078D4;
  // color:#ffffff;
  // padding:15px 35px;
  // text-decoration:none;
  // font-size:16px;
  // font-weight:bold;
  // border-radius:6px;
  // display:inline-block;
  // ">
  // 🎁 Select Your Gift
  // </a>

  // </div>

  // <p style="margin-top:25px;font-size:13px;color:#666;">
  // If the button above doesn't work, copy and paste the link below into your browser:
  // </p>

  // <p style="word-break:break-all;">
  // <a href="${giftLink}" style="color:#0078D4;">
  // ${giftLink}
  // </a>
  // </p>

  // </td>
  // </tr>

  // <tr>
  // <td style="background:#f4f4f4;padding:20px;text-align:center;">

  // <p style="margin:0;color:#777;font-size:12px;">
  // This link is personal and valid for 7 days.
  // Please do not share it with anyone.
  // </p>

  // <p style="margin-top:10px;color:#999;font-size:12px;">
  // © ${new Date().getFullYear()} ${org?.name || "Giftworks"}.
  // All Rights Reserved.
  // </p>

  // </td>
  // </tr>

  // </table>

  // </td>
  // </tr>
  // </table>

  // </body>
  // </html>
  // `;
  //             return {
  //               to: emp.email,
  //               subject: `🎁 ${campaignName} — Select Your Gift`,
  //               html: finalHtml,
  //             };
  //           });
  //           console.log(`📧 Sending emails to ${mailList.length} employees...`);
  //           const mailResult = await sendBulkMail(mailList);
  //           console.log(`📧 Email result:`, mailResult);
  //         }
  //       }

  //       let responseCode = returnCode.validSession;
  //       UtilController.sendSuccess(req, res, next, {
  //         responseCode,
  //         message: "Campaign created successfully",
  //         data: {
  //           campaignId: campaign._id,
  //           campaignName: campaign.campaignName,
  //           totalEmployees: employeeRows.length,
  //           employeesInserted: bulkResult?.upsertedCount || 0,
  //           employeesUpdated: bulkResult?.modifiedCount || 0,
  //         },
  //       });
  //     } catch (err) {
  //       console.log("❌ err: ", err);
  //       UtilController.sendError(req, res, next, err);
  //     }
  //   },

  editCampaign: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const { _id } = req.body;

      if (!_id) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Campaign id is required",
        });
      }

      let updateObj = { ...req.body };

      delete updateObj._id;
      delete updateObj.campaignId;
      delete updateObj.organization;
      delete updateObj.hr;
      delete updateObj.createdBy;
      delete updateObj.createdAt;
      delete updateObj.employeeFile;
      delete updateObj.employeeFileName;
      delete updateObj.productIds;

      // if products array passed update snapshot
      if (req.body.productIds) {
        const parsedProductIds = Array.isArray(req.body.productIds)
          ? req.body.productIds
          : JSON.parse(req.body.productIds);

        if (parsedProductIds.length > 0) {
          const selectedProducts = await Product.find(
            { _id: { $in: parsedProductIds }, active: true },
            {
              name: 1,
              price: 1,
              discountPrice: 1,
              thumbnailImage: 1,
              vendor: 1,
            },
          ).lean();

          updateObj.products = selectedProducts.map((p) => ({
            product: p._id,
            name: p.name,
            price: p.price,
            discountPrice: p.discountPrice,
            thumbnailImage: p.thumbnailImage,
            vendor: p.vendor,
          }));
        }
      }

      updateObj.updatedBy = userId;
      updateObj.updatedAt = Math.floor(Date.now() / 1000);

      const campaign = await Campaign.findOneAndUpdate(
        { _id, active: true },
        { $set: updateObj },
        { new: true },
      ).lean();

      if (!campaign) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.dataNotFound,
          message: "Campaign not found",
        });
      }

      let responseCode = returnCode.validSession;
      UtilController.sendSuccess(req, res, next, {
        responseCode,
        message: "Campaign updated successfully",
        data: campaign,
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },

  getCampaignDetails: async (req, res, next) => {
    try {
      const { _id } = req.query;

      if (!_id) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Campaign id is required",
        });
      }

      const campaign = await Campaign.aggregate([
        {
          $match: {
            _id: UtilController.convertToMongoose(_id),
            active: true,
          },
        },
        {
          $lookup: {
            from: "organizations",
            localField: "organizationId",
            foreignField: "_id",
            as: "organization",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "hrId",
            foreignField: "_id",
            as: "hr",
          },
        },
        {
          $unwind: {
            path: "$organization",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$hr",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$products",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "products.vendor",
            foreignField: "_id",
            as: "vendor",
          },
        },
        {
          $unwind: {
            path: "$vendor",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: "$_id",
            campaignId: { $first: "$campaignId" },
            campaignName: { $first: "$campaignName" },
            occasion: { $first: "$occasion" },
            budgetPerEmployee: { $first: "$budgetPerEmployee" },
            deliveryWindowStart: { $first: "$deliveryWindowStart" },
            deliveryWindowEnd: { $first: "$deliveryWindowEnd" },
            campaignDeadline: { $first: "$campaignDeadline" },
            giftingModel: { $first: "$giftingModel" },
            message: { $first: "$message" },
            totalEmployees: { $first: "$totalEmployees" },
            giftsSelected: { $first: "$giftsSelected" },
            ordersShipped: { $first: "$ordersShipped" },
            deliveredOrders: { $first: "$deliveredOrders" },
            employeeFile: { $first: "$employeeFile" },
            status: { $first: "$status" },
            active: { $first: "$active" },
            createdAt: { $first: "$createdAt" },
            updatedAt: { $first: "$updatedAt" },

            organization: {
              $first: {
                _id: "$organization._id",
                name: "$organization.name",
                email: "$organization.email",
                logo: "$organization.logo",
              },
            },

            hr: {
              $first: {
                _id: "$hr._id",
                fullName: "$hr.fullName",
                email: "$hr.email",
                mobileNumber: "$hr.mobileNumber",
              },
            },

            products: {
              $push: {
                product: "$products.product",
                name: "$products.name",
                price: "$products.price",
                discountPrice: "$products.discountPrice",
                thumbnailImage: "$products.thumbnailImage",
                description: "$products.description",
                category: "$products.category",
                brand: "$products.brand",
                vendor: {
                  _id: "$vendor._id",
                  fullName: "$vendor.fullName",
                  email: "$vendor.email",
                  mobileNumber: "$vendor.mobileNumber",
                },
              },
            },
          },
        },
      ]);

      if (!campaign.length) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.dataNotFound,
          message: "Campaign not found",
        });
      }

      UtilController.sendSuccess(req, res, next, {
        responseCode: returnCode.validSession,
        message: "Campaign details fetched successfully",
        data: campaign[0],
      });
    } catch (err) {
      console.log(err);
      UtilController.sendError(req, res, next, err);
    }
  },

  listCampaign: async (req, res, next) => {
    try {
      const { ...filters } = req.body;
      const organizationId = req.user.organizationId;

      let queryObj = {
        active: filters.active ?? true,
      };
      if (filters.active === "All") {
        delete queryObj.active;
      }

      // HR sees only their org campaigns
      // SuperAdmin can pass organizationId filter or see all
      if (organizationId) {
        queryObj.organization = organizationId;
      } else if (filters.organization) {
        queryObj.organization = filters.organization;
      }

      if (filters.giftingModel) {
        queryObj.giftingModel = filters.giftingModel;
      }

      if (filters.status) {
        queryObj.status = filters.status;
      }

      let sortOrder = { updatedAt: -1 };

      let page = 0;
      let pageSize = 10;
      if (
        !UtilController.isEmpty(filters.page) &&
        !UtilController.isEmpty(filters.pageSize)
      ) {
        page = Number(filters.page);
        pageSize = Number(filters.pageSize);
      }

      let searchKey = filters.keyword ?? "";

      if (!UtilController.isEmpty(filters.startDate)) {
        queryObj["$and"] = [
          { createdAt: { $gte: filters.startDate } },
          {
            createdAt: {
              $lte: filters.endDate || Math.floor(new Date() / 1000),
            },
          },
        ];
      }

      const pipeline = [
        { $match: queryObj },
        {
          $lookup: {
            from: "organizations",
            localField: "organization",
            foreignField: "_id",
            as: "organizationDetails",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "hr",
            foreignField: "_id",
            as: "hrDetails",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdByUser",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "updatedBy",
            foreignField: "_id",
            as: "updatedByUser",
          },
        },
        {
          $project: {
            _id: 1,
            campaignId: 1,
            campaignName: 1,
            occasion: 1,
            giftingModel: 1,
            status: 1,
            budgetPerEmployee: 1,
            campaignDeadline: 1,
            deliveryWindowStart: 1,
            deliveryWindowEnd: 1,
            totalEmployees: 1,
            giftsSelected: 1,
            products: 1,
            ordersShipped: 1,
            deliveredOrders: 1,
            active: 1,
            createdAt: 1,
            updatedAt: 1,
            organizationName: {
              $arrayElemAt: ["$organizationDetails.name", 0],
            },
            hrName: {
              $arrayElemAt: ["$hrDetails.fullName", 0],
            },
            createdByUser: {
              $arrayElemAt: ["$createdByUser.fullName", 0],
            },
            updatedByUser: {
              $arrayElemAt: ["$updatedByUser.fullName", 0],
            },
          },
        },
        ...(searchKey
          ? [
              {
                $match: {
                  $or: [
                    { campaignName: { $regex: searchKey, $options: "i" } },
                    { occasion: { $regex: searchKey, $options: "i" } },
                    { organizationName: { $regex: searchKey, $options: "i" } },
                    { hrName: { $regex: searchKey, $options: "i" } },
                    { createdByUser: { $regex: searchKey, $options: "i" } },
                  ],
                },
              },
            ]
          : []),
        { $sort: sortOrder },
        { $skip: page * pageSize },
        { $limit: pageSize },
      ];

      const result = await Campaign.aggregate(pipeline);
      let pageCount = await Campaign.countDocuments(queryObj);

      UtilController.sendSuccess(req, res, next, {
        rows: result,
        pages: Math.ceil(pageCount / pageSize),
        filterRecords: pageCount,
        message: "success",
        responseCode: returnCode.validSession,
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },

  deleteCampaign: async (req, res, next) => {
    try {
      const { campaignIds } = req.body;
      const userId = req.user._id;

      if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Campaign id(s) are required",
        });
      }

      const result = await Campaign.updateMany(
        { _id: { $in: campaignIds }, active: true },
        {
          $set: {
            active: false,
            updatedBy: userId,
            updatedAt: Math.floor(Date.now() / 1000),
          },
        },
      );

      if (result.matchedCount === 0) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.dataNotFound,
          message: "Campaign not found",
        });
      }

      let responseCode = returnCode.validSession;
      UtilController.sendSuccess(req, res, next, {
        responseCode,
        message: "Campaign deleted successfully",
        data: "",
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },
};
