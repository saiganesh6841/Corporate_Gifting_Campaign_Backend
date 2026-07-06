const { returnCode } = require("../../../config/responseCode");
const User = require("../../model/User");
const Campaign = require("../../model/campaign");
const Order = require("../../model/order");
const Organization = require("../../model/organization");
const { sendMail } = require("../services/MailService");
const UtilController = require("../services/UtilController");
const crypto = require("crypto");

module.exports = {
  // ── CREATE ────────────────────────────────────────────────────
  // Admin/HR manually creates a single order for an employee.
  // Employee can be selected from existing User records OR created fresh.
  //   createOrder: async (req, res, next) => {
  //     try {
  //       const userId = req.user.userId;

  //       const {
  //         campaignId,
  //         productId,
  //         employeeId,
  //         fullName,
  //         email,
  //         mobileNumber,
  //         department,
  //         address,
  //         city,
  //         state,
  //         pincode,
  //       } = req.body;

  //       if (!campaignId) {
  //         return UtilController.sendError(req, res, next, {
  //           responseCode: returnCode.invalidParams,
  //           message: "Campaign is required",
  //         });
  //       }
  //       if (!productId) {
  //         return UtilController.sendError(req, res, next, {
  //           responseCode: returnCode.invalidParams,
  //           message: "Product selection is required",
  //         });
  //       }
  //       if (!employeeId && !fullName) {
  //         return UtilController.sendError(req, res, next, {
  //           responseCode: returnCode.invalidParams,
  //           message:
  //             "Select an existing employee or provide new employee details",
  //         });
  //       }
  //       if (!address || !city || !pincode) {
  //         return UtilController.sendError(req, res, next, {
  //           responseCode: returnCode.invalidParams,
  //           message: "Delivery address fields are required",
  //         });
  //       }

  //       // fetch campaign + org in parallel
  //       const campaign = await Campaign.findOne(
  //         { _id: campaignId, active: true },
  //         {
  //           products: 1,
  //           budgetPerEmployee: 1,
  //           campaignDeadline: 1,
  //           organization: 1,
  //           campaignName: 1,
  //           giftingModel: 1,
  //           emailTextInformation: 1,
  //           message: 1,
  //         },
  //       ).lean();

  //       if (!campaign) {
  //         return UtilController.sendError(req, res, next, {
  //           responseCode: returnCode.dataNotFound,
  //           message: "Campaign not found",
  //         });
  //       }

  //       const now = Math.floor(Date.now() / 1000);

  //       if (campaign?.campaignDeadline && campaign?.campaignDeadline < now) {
  //         return UtilController.sendError(req, res, next, {
  //           responseCode: returnCode.invalidParams,
  //           message: "This campaign has ended",
  //         });
  //       }

  //       const campaignProduct = campaign.products?.find(
  //         (p) => p?.product?.toString() === productId?.toString(),
  //       );

  //       if (!campaignProduct) {
  //         return UtilController.sendError(req, res, next, {
  //           responseCode: returnCode.invalidParams,
  //           message: "Selected product is not part of this campaign",
  //         });
  //       }

  //       const productPrice =
  //         campaignProduct?.discountPrice || campaignProduct?.price;

  //       if (productPrice > campaign?.budgetPerEmployee) {
  //         return UtilController.sendError(req, res, next, {
  //           responseCode: returnCode.invalidParams,
  //           message: "Selected product exceeds campaign budget",
  //         });
  //       }

  //       // ── resolve employee ──────────────────────────────────────
  //       let employee;

  //       if (employeeId) {
  //         employee = await User.findOne(
  //           { _id: employeeId, userType: "employee", active: true },
  //           {
  //             _id: 1,
  //             fullName: 1,
  //             email: 1,
  //             mobileNumber: 1,
  //             organizationId: 1,
  //             linkToken: 1,
  //             giftLink: 1,
  //           },
  //         ).lean();

  //         if (!employee) {
  //           return UtilController.sendError(req, res, next, {
  //             responseCode: returnCode.dataNotFound,
  //             message: "Selected employee not found",
  //           });
  //         }
  //       } else {
  //         if (!email && !mobileNumber) {
  //           return UtilController.sendError(req, res, next, {
  //             responseCode: returnCode.invalidParams,
  //             message: "Email or mobile number is required for a new employee",
  //           });
  //         }

  //         const existing = await User.findOne({
  //           $or: [
  //             ...(email ? [{ email: email.trim().toLowerCase() }] : []),
  //             ...(mobileNumber ? [{ mobileNumber: mobileNumber.trim() }] : []),
  //           ],
  //           active: true,
  //         }).lean();

  //         if (existing) {
  //           return UtilController.sendError(req, res, next, {
  //             responseCode: returnCode.duplicate,
  //             message:
  //               existing.email === email?.trim().toLowerCase()
  //                 ? "Email already exists"
  //                 : "Mobile number already exists",
  //           });
  //         }

  //         const org = await Organization.findById(campaign.organization, {
  //           name: 1,
  //         }).lean();

  //         const linkToken = crypto.randomBytes(32).toString("hex");
  //         const tokenExpiresAt = now + 7 * 24 * 60 * 60;
  //         const BASE_GIFT_URL = "http://localhost:5173/#/gift";
  //         const giftLink = `${BASE_GIFT_URL}/${linkToken}`;

  //         const orgPrefix = (org?.name || "EMP")
  //           .replace(/[^a-zA-Z]/g, "")
  //           .substring(0, 3)
  //           .toUpperCase();

  //         const lastEmployee = await User.findOne(
  //           {
  //             userType: "employee",
  //             userId: { $regex: `^${orgPrefix}`, $options: "i" },
  //           },
  //           { userId: 1 },
  //         )
  //           .sort({ userId: -1 })
  //           .lean();

  //         let nextSeq = 1;
  //         if (lastEmployee?.userId) {
  //           const numPart = lastEmployee.userId.replace(
  //             new RegExp(`^${orgPrefix}`, "i"),
  //             "",
  //           );
  //           const parsed = parseInt(numPart, 10);
  //           if (!isNaN(parsed)) nextSeq = parsed + 1;
  //         }

  //         const newEmployee = new User({
  //           userId: orgPrefix + String(nextSeq).padStart(5, "0"),
  //           fullName: fullName?.trim() || "",
  //           email: email?.trim().toLowerCase() || "",
  //           mobileNumber: mobileNumber?.trim() || "",
  //           userType: "employee",
  //           organizationId: campaign.organization,
  //           organizationName: org?.name || "",
  //           hrId: userId,
  //           department: department || "",
  //           address,
  //           city,
  //           state: state || "",
  //           pincode,
  //           linkToken,
  //           tokenExpiresAt,
  //           giftLink,
  //           lastCampaignId: campaign._id,
  //           active: true,
  //           createdBy: userId,
  //           updatedBy: userId,
  //         });

  //         await newEmployee.save();
  //         employee = newEmployee.toObject();
  //         employee.giftLink = giftLink;
  //         employee.linkToken = linkToken;
  //       }

  //       // prevent duplicate order
  //       const existingOrder = await Order.findOne({
  //         campaign: campaign?._id,
  //         employee: employee?._id,
  //         active: true,
  //       }).lean();

  //       if (existingOrder) {
  //         return UtilController.sendError(req, res, next, {
  //           responseCode: returnCode.duplicate,
  //           message: "An order already exists for this employee in this campaign",
  //         });
  //       }

  //       // always sync address back onto employee User doc
  //       await User.updateOne(
  //         { _id: employee._id },
  //         {
  //           $set: {
  //             address,
  //             city,
  //             state: state || "",
  //             pincode,
  //             updatedBy: userId,
  //             updatedAt: now,
  //           },
  //         },
  //       );

  //       const order = new Order({
  //         organization: campaign.organization,
  //         campaign: campaign._id,
  //         employee: employee._id,
  //         product: productId,
  //         vendor: campaignProduct.vendor,
  //         productSnapshot: {
  //           name: campaignProduct.name || "",
  //           price: campaignProduct.price || 0,
  //           discountPrice: campaignProduct.discountPrice || 0,
  //           thumbnailImage: campaignProduct.thumbnailImage || "",
  //         },
  //         deliveryAddress: {
  //           fullName: employee.fullName,
  //           email: employee.email,
  //           mobileNumber: employee.mobileNumber || mobileNumber || "",
  //           address,
  //           city,
  //           state: state || "",
  //           pincode,
  //         },
  //         quantity: 1,
  //         price: productPrice,
  //         status: "pending",
  //         active: true,
  //         createdBy: userId,
  //         updatedBy: userId,
  //       });

  //       await order.save();
  //       order.orderId = order._id.toString();
  //       await order.save();

  //       await Campaign.updateOne(
  //         { _id: campaign._id },
  //         { $inc: { giftsSelected: 1 } },
  //       );

  //       // ── EMPLOYEE CHOICE — send gift selection email ───────────
  //       // only send if giftingModel is employee_choice AND employee has email
  //       // order is created as a placeholder but employee still needs to pick product
  //       if (
  //         campaign?.giftingModel === "employee_choice" &&
  //         employee?.email &&
  //         campaign?.emailTextInformation
  //       ) {
  //         try {
  //           const org = await Organization.findById(campaign.organization, {
  //             name: 1,
  //           }).lean();

  //           let emailHtmlContent = "";
  //           try {
  //             emailHtmlContent = decodeURIComponent(
  //               escape(
  //                 Buffer.from(campaign.emailTextInformation, "base64").toString(
  //                   "binary",
  //                 ),
  //               ),
  //             );
  //           } catch (e) {
  //             console.log("❌ Failed to decode emailTextInformation:", e.message);
  //           }

  //           if (emailHtmlContent) {
  //             const giftLink =
  //               employee.giftLink ||
  //               `http://localhost:5173/#/gift/${employee?.linkToken}`;

  //             const deadlineDate = campaign?.campaignDeadline
  //               ? new Date(
  //                   Number(campaign.campaignDeadline) * 1000,
  //                 ).toLocaleDateString("en-IN", {
  //                   day: "2-digit",
  //                   month: "long",
  //                   year: "numeric",
  //                 })
  //               : "";

  //             const resolvedHtml = emailHtmlContent
  //               .replace(/\{\{OrganizationName\}\}/g, org?.name || "")
  //               .replace(/\{\{CampaignDeadline\}\}/g, deadlineDate);
  //             //   .replace(/\{\{GiftSelectionLink\}\}/g, "");

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
  // <tr><td align="center">
  // <table width="650" cellpadding="0" cellspacing="0" border="0"
  //   style="background:#ffffff;border-radius:10px;overflow:hidden;">
  //   <tr>
  //     <td style="background:#0078D4;padding:25px;text-align:center;">
  //       <h2 style="margin:0;color:#ffffff;font-size:24px;">🎁 ${campaignName}</h2>
  //       <p style="margin-top:8px;color:#d9ecff;font-size:14px;">${org?.name || ""}</p>
  //     </td>
  //   </tr>
  //   <tr>
  //     <td style="padding:35px;">
  //       <p style="margin:0 0 20px 0;font-size:16px;color:#333;">
  //         Dear <strong>${emp.fullName}</strong>,
  //       </p>
  //       <div style="font-size:15px;color:#444;line-height:1.8;">
  //         ${resolvedHtml}
  //       </div>
  //       <div style="margin-top:35px;text-align:center;">
  //         <a href="${giftLink}" target="_blank"
  //           style="background:#0078D4;color:#ffffff;padding:15px 35px;text-decoration:none;font-size:16px;font-weight:bold;border-radius:6px;display:inline-block;">
  //           🎁 Select Your Gift
  //         </a>
  //       </div>
  //       <p style="margin-top:25px;font-size:13px;color:#666;">
  //         If the button above doesn't work, copy and paste this link:
  //       </p>
  //       <p style="word-break:break-all;">
  //         <a href="${giftLink}" style="color:#0078D4;">${giftLink}</a>
  //       </p>
  //     </td>
  //   </tr>
  //   <tr>
  //     <td style="background:#f4f4f4;padding:20px;text-align:center;">
  //       <p style="margin:0;color:#777;font-size:12px;">
  //         This link is personal and valid for 7 days. Do not share it with anyone.
  //       </p>
  //       <p style="margin-top:10px;color:#999;font-size:12px;">
  //         © ${new Date().getFullYear()} ${org?.name || "Giftworks"}. All Rights Reserved.
  //       </p>
  //     </td>
  //   </tr>
  // </table>
  // </td></tr>
  // </table>
  // </body>
  // </html>`;

  //             await sendMail({
  //               to: employee.email,
  //               subject: `🎁 ${campaign?.campaignName} — Select Your Gift`,
  //               html: finalHtml,
  //             });

  //             console.log(`📧 Gift selection email sent to ${employee?.email}`);
  //           }
  //         } catch (mailErr) {
  //           // don't fail the order creation if email fails
  //           // log and continue
  //           console.log(
  //             "❌ Email send failed (order still created):",
  //             mailErr.message,
  //           );
  //         }
  //       }

  //       let responseCode = returnCode.validSession;
  //       UtilController.sendSuccess(req, res, next, {
  //         responseCode,
  //         message: "Order created successfully",
  //         data: order,
  //       });
  //     } catch (err) {
  //       console.log("err: ", err);
  //       UtilController.sendError(req, res, next, err);
  //     }
  //   },
  createOrder: async (req, res, next) => {
    try {
      const userId = req.user.userId;

      const {
        campaignId,
        employeeId,
        fullName,
        email,
        mobileNumber,
        department,
        address,
        city,
        state,
        pincode,
      } = req.body;

      // ── validations ───────────────────────────────────────────
      if (!campaignId) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Campaign is required",
        });
      }
      if (!employeeId && !fullName) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message:
            "Select an existing employee or provide new employee details",
        });
      }
      if (!address || !city || !pincode) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Delivery address fields are required",
        });
      }

      // ── fetch campaign ────────────────────────────────────────
      const campaign = await Campaign.findOne(
        { _id: campaignId, active: true },
        {
          products: 1,
          budgetPerEmployee: 1,
          campaignDeadline: 1,
          organization: 1,
          campaignName: 1,
          giftingModel: 1,
          emailTextInformation: 1,
          message: 1,
        },
      ).lean();

      if (!campaign) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.dataNotFound,
          message: "Campaign not found",
        });
      }

      const now = Math.floor(Date.now() / 1000);

      if (campaign?.campaignDeadline && campaign?.campaignDeadline < now) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "This campaign has ended",
        });
      }

      if (!campaign.products || campaign.products.length === 0) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Campaign has no products configured",
        });
      }

      // ── derive product from campaign ──────────────────────────
      // hr_selected  → always products[0] (only one product in array)
      // employee_choice → products[0] as placeholder
      //                   employee picks actual product via gift link
      const campaignProduct = campaign.products[0];
      const productId = campaignProduct?.product;

      const productPrice =
        campaignProduct?.discountPrice || campaignProduct?.price;

      // ── resolve employee — existing or newly created ──────────
      let employee;

      if (employeeId) {
        employee = await User.findOne(
          { _id: employeeId, userType: "employee", active: true },
          {
            _id: 1,
            fullName: 1,
            email: 1,
            mobileNumber: 1,
            organizationId: 1,
            linkToken: 1,
            giftLink: 1,
          },
        ).lean();

        if (!employee) {
          return UtilController.sendError(req, res, next, {
            responseCode: returnCode.dataNotFound,
            message: "Selected employee not found",
          });
        }
      } else {
        // new employee path
        if (!email && !mobileNumber) {
          return UtilController.sendError(req, res, next, {
            responseCode: returnCode.invalidParams,
            message: "Email or mobile number is required for a new employee",
          });
        }

        // duplicate check
        const existing = await User.findOne({
          $or: [
            ...(email ? [{ email: email.trim().toLowerCase() }] : []),
            ...(mobileNumber ? [{ mobileNumber: mobileNumber.trim() }] : []),
          ],
          active: true,
        }).lean();

        if (existing) {
          return UtilController.sendError(req, res, next, {
            responseCode: returnCode.duplicate,
            message:
              existing.email === email?.trim().toLowerCase()
                ? "Email already exists"
                : "Mobile number already exists",
          });
        }

        const org = await Organization.findById(campaign.organization, {
          name: 1,
        }).lean();

        const linkToken = crypto.randomBytes(32).toString("hex");
        const tokenExpiresAt = now + 7 * 24 * 60 * 60; // 7 days
        const BASE_GIFT_URL = "http://localhost:5173/#/gift";
        const giftLink = `${BASE_GIFT_URL}/${linkToken}`;

        // generate org-prefix userId e.g. ACM00001
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

        let nextSeq = 1;
        if (lastEmployee?.userId) {
          const numPart = lastEmployee.userId.replace(
            new RegExp(`^${orgPrefix}`, "i"),
            "",
          );
          const parsed = parseInt(numPart, 10);
          if (!isNaN(parsed)) nextSeq = parsed + 1;
        }

        const newEmployee = new User({
          userId: orgPrefix + String(nextSeq).padStart(5, "0"),
          fullName: fullName?.trim() || "",
          email: email?.trim().toLowerCase() || "",
          mobileNumber: mobileNumber?.trim() || "",
          userType: "employee",
          organizationId: campaign.organization,
          organizationName: org?.name || "",
          hrId: userId,
          department: department || "",
          address,
          city,
          state: state || "",
          pincode,
          linkToken,
          tokenExpiresAt,
          giftLink,
          lastCampaignId: campaign._id,
          active: true,
          createdBy: userId,
          updatedBy: userId,
        });

        await newEmployee.save();
        employee = newEmployee.toObject();
        employee.giftLink = giftLink;
        employee.linkToken = linkToken;
      }

      // ── prevent duplicate order for same employee + campaign ──
      const existingOrder = await Order.findOne({
        campaign: campaign?._id,
        employee: employee?._id,
        active: true,
      }).lean();

      if (existingOrder) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.duplicate,
          message: "An order already exists for this employee in this campaign",
        });
      }

      // ── always sync delivery address back onto employee User doc
      await User.updateOne(
        { _id: employee._id },
        {
          $set: {
            address,
            city,
            state: state || "",
            pincode,
            updatedBy: userId,
            updatedAt: now,
          },
        },
      );

      // ── create order ──────────────────────────────────────────
      const order = new Order({
        organization: campaign.organization,
        campaign: campaign._id,
        employee: employee._id,
        product: productId,
        vendor: campaignProduct?.vendor,
        productSnapshot: {
          name: campaignProduct?.name || "",
          price: campaignProduct?.price || 0,
          discountPrice: campaignProduct?.discountPrice || 0,
          thumbnailImage: campaignProduct?.thumbnailImage || "",
        },
        deliveryAddress: {
          fullName: employee.fullName || "",
          email: employee.email || "",
          mobileNumber: employee.mobileNumber || mobileNumber || "",
          address,
          city,
          state: state || "",
          pincode,
        },
        quantity: 1,
        price: productPrice,
        status: "pending",
        active: true,
        createdBy: userId,
        updatedBy: userId,
      });

      await order.save();
      order.orderId = order._id.toString();
      await order.save();

      // increment campaign giftsSelected counter
      await Campaign.updateOne(
        { _id: campaign._id },
        { $inc: { giftsSelected: 1 } },
      );

      // ── EMPLOYEE CHOICE — send gift selection email ───────────
      // for hr_selected the product is fixed so no email needed
      // for employee_choice the employee picks via the gift link
      if (
        campaign?.giftingModel === "employee_choice" &&
        employee?.email &&
        campaign?.emailTextInformation
      ) {
        try {
          const org = await Organization.findById(campaign.organization, {
            name: 1,
          }).lean();

          let emailHtmlContent = "";
          try {
            emailHtmlContent = decodeURIComponent(
              escape(
                Buffer.from(campaign.emailTextInformation, "base64").toString(
                  "binary",
                ),
              ),
            );
          } catch (e) {
            console.log("❌ Failed to decode emailTextInformation:", e.message);
          }

          if (emailHtmlContent) {
            const giftLink =
              employee.giftLink ||
              `http://13.201.19.72:4000/#/gift/${employee?.linkToken}`;

            const deadlineDate = campaign?.campaignDeadline
              ? new Date(
                  Number(campaign.campaignDeadline) * 1000,
                ).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
              : "";

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
<title>${campaign?.campaignName || ""}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f5;padding:30px 0;">
<tr><td align="center">
<table width="650" cellpadding="0" cellspacing="0" border="0"
  style="background:#ffffff;border-radius:10px;overflow:hidden;">
  <tr>
    <td style="background:#0078D4;padding:25px;text-align:center;">
      <h2 style="margin:0;color:#ffffff;font-size:24px;">🎁 ${campaign?.campaignName || ""}</h2>
      <p style="margin-top:8px;color:#d9ecff;font-size:14px;">${org?.name || ""}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:35px;">
      <p style="margin:0 0 20px 0;font-size:16px;color:#333;">
        Dear <strong>${employee?.fullName || ""}</strong>,
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

            await sendMail({
              to: employee.email,
              subject: `🎁 ${campaign?.campaignName} — Select Your Gift`,
              html: finalHtml,
            });

            console.log(`📧 Gift selection email sent to ${employee?.email}`);
          }
        } catch (mailErr) {
          // email failure never blocks order creation
          console.log(
            "❌ Email send failed (order still created):",
            mailErr?.message,
          );
        }
      }

      let responseCode = returnCode.validSession;
      UtilController.sendSuccess(req, res, next, {
        responseCode,
        message: "Order created successfully",
        data: order,
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },
  // ── EDIT ──────────────────────────────────────────────────────
  editOrder: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const {
        _id,
        status,
        awb,
        courier,
        expectedDeliveryDate,
        deliveryAddress,
      } = req.body;

      if (!_id) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Order id is required",
        });
      }

      const validStatuses = [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "approved",
      ];
      if (status && !validStatuses.includes(status)) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Invalid order status",
        });
      }

      let updateObj = {
        updatedBy: userId,
        updatedAt: Math.floor(Date.now() / 1000),
      };

      if (status) {
        updateObj.status = status;
        if (status === "delivered") {
          updateObj.deliveredAt = Math.floor(Date.now() / 1000);
        }
      }
      if (awb !== undefined) updateObj.awb = awb;
      if (courier !== undefined) updateObj.courier = courier;
      if (expectedDeliveryDate !== undefined)
        updateObj.expectedDeliveryDate = Number(expectedDeliveryDate);
      if (deliveryAddress) {
        updateObj.deliveryAddress = {
          fullName: deliveryAddress.fullName || "",
          mobileNumber: deliveryAddress.mobileNumber || "",
          addressLine: deliveryAddress.addressLine || "",
          city: deliveryAddress.city || "",
          state: deliveryAddress.state || "",
          pincode: deliveryAddress.pincode || "",
          landmark: deliveryAddress.landmark || "",
        };
      }

      const order = await Order.findOneAndUpdate(
        { _id, active: true },
        { $set: updateObj },
        { new: true },
      ).lean();

      if (!order) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.dataNotFound,
          message: "Order not found",
        });
      }

      // keep campaign counters in sync
      if (status === "shipped") {
        await Campaign.updateOne(
          { _id: order.campaign },
          { $inc: { ordersShipped: 1 } },
        );
      }
      if (status === "delivered") {
        await Campaign.updateOne(
          { _id: order.campaign },
          { $inc: { deliveredOrders: 1 } },
        );
      }

      let responseCode = returnCode.validSession;
      UtilController.sendSuccess(req, res, next, {
        responseCode,
        message: "Order updated successfully",
        data: order,
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },

  // ── DETAILS ───────────────────────────────────────────────────
  getOrderDetails: async (req, res, next) => {
    try {
      const { _id } = req.query;

      if (!_id) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Order id is required",
        });
      }

      const order = await Order.findOne({ _id, active: true })
        .populate(
          "employee",
          "fullName email mobileNumber userId employeeCode department",
        )
        .populate("vendor", "fullName email mobileNumber")
        .populate(
          "campaign",
          "campaignName occasion giftingModel products campaignDeadline deliveryWindowStart deliveryWindowEnd budgetPerEmployee ",
        )
        .populate("organization", "name email logo")
        .lean();

      if (!order) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.dataNotFound,
          message: "Order not found",
        });
      }

      let responseCode = returnCode.validSession;
      UtilController.sendSuccess(req, res, next, {
        responseCode,
        message: "Order details fetched successfully",
        data: order,
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },

  // ── LIST ──────────────────────────────────────────────────────
  listOrder: async (req, res, next) => {
    try {
      const { ...filters } = req.body;
      let queryObj = {
        active: filters.active ?? true,
      };
      if (filters.active === "All") {
        delete queryObj.active;
      }

      if (filters.organization) {
        queryObj.organization = filters.organization;
      }
      if (filters.campaign) {
        queryObj.campaign = filters.campaign;
      }
      if (filters.vendor) {
        queryObj.vendor = filters.vendor;
      }
      if (filters.employee) {
        queryObj.employee = filters.employee;
      }
      if (filters.status && filters.status !== "All") {
        queryObj.status = filters.status;
      }

      // vendor-side login only sees their own orders
      if (req.user.userType === "vendor") {
        // queryObj.vendor = req.user.userId;
        const vendorUser = await User.findOne(
          { _id: req.user.userId, active: true },
          { _id: 1 },
        ).lean();

        if (!vendorUser) {
          return UtilController.sendError(req, res, next, {
            responseCode: returnCode.dataNotFound,
            message: "Vendor not found",
          });
        }
        queryObj.vendor = vendorUser._id;
      }
      // HR-side login only sees their org's orders
      if (req.user.userType === "hr" && req.user.organizationId) {
        queryObj.organization = req.user.organizationId;
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
            from: "users",
            localField: "employee",
            foreignField: "_id",
            as: "employeeDetails",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "vendor",
            foreignField: "_id",
            as: "vendorDetails",
          },
        },
        {
          $lookup: {
            from: "campaigns",
            localField: "campaign",
            foreignField: "_id",
            as: "campaignDetails",
          },
        },
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
            orderId: 1,
            productSnapshot: 1,
            deliveryAddress: 1,
            quantity: 1,
            price: 1,
            status: 1,
            awb: 1,
            courier: 1,
            expectedDeliveryDate: 1,
            deliveredAt: 1,
            active: 1,
            createdAt: 1,
            updatedAt: 1,
            employeeName: { $arrayElemAt: ["$employeeDetails.fullName", 0] },
            employeeUserId: { $arrayElemAt: ["$employeeDetails.userId", 0] },
            vendorName: { $arrayElemAt: ["$vendorDetails.fullName", 0] },
            campaignName: {
              $arrayElemAt: ["$campaignDetails.campaignName", 0],
            },
            organizationName: {
              $arrayElemAt: ["$organizationDetails.name", 0],
            },
            createdByUser: { $arrayElemAt: ["$createdByUser.fullName", 0] },
            updatedByUser: { $arrayElemAt: ["$updatedByUser.fullName", 0] },
          },
        },
        ...(searchKey
          ? [
              {
                $match: {
                  $or: [
                    { orderId: { $regex: searchKey, $options: "i" } },
                    {
                      "productSnapshot.name": {
                        $regex: searchKey,
                        $options: "i",
                      },
                    },
                    { employeeName: { $regex: searchKey, $options: "i" } },
                    { employeeUserId: { $regex: searchKey, $options: "i" } },
                    { vendorName: { $regex: searchKey, $options: "i" } },
                    { campaignName: { $regex: searchKey, $options: "i" } },
                    { organizationName: { $regex: searchKey, $options: "i" } },
                    { awb: { $regex: searchKey, $options: "i" } },
                  ],
                },
              },
            ]
          : []),
        { $sort: sortOrder },
        { $skip: page * pageSize },
        { $limit: pageSize },
      ];

      const result = await Order.aggregate(pipeline);
      let pageCount = await Order.countDocuments(queryObj);

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

  // ── DELETE (multi, soft delete) ─────────────────────────────
  deleteOrder: async (req, res, next) => {
    try {
      const { orderIds } = req.body;
      const userId = req.user.userId;

      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Order id(s) are required",
        });
      }

      const result = await Order.updateMany(
        { _id: { $in: orderIds }, active: true },
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
          message: "Order not found",
        });
      }

      let responseCode = returnCode.validSession;
      UtilController.sendSuccess(req, res, next, {
        responseCode,
        message: "Order deleted successfully",
        data: "",
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },
};
