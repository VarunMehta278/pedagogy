import PDFDocument from "pdfkit";
import QRCode from "qrcode";

type CertificateData = {
  certificateCode: string;
  studentName: string;
  eventTitle: string;
  position?: number | null;
  certificateType: "winner" | "participation";
  eventDate?: string | null;
  department?: string | null;
  /*
   * Team events only. The certificate still belongs to one member —
   * studentName stays their name, so each person downloads their own —
   * but it also records the team they competed with and who else was
   * in it.
   */
  teamName?: string | null;
  teamMembers?: string[] | null;
};

const getPositionText = (position?: number | null) => {
  if (!position) return "";

  /*
   * 11th, 12th and 13th are irregular, so they are
   * handled before the general rule.
   */
  if (position % 100 >= 11 && position % 100 <= 13) {
    return `${position}th Place`;
  }

  switch (position % 10) {
    case 1:
      return `${position}st Place`;

    case 2:
      return `${position}nd Place`;

    case 3:
      return `${position}rd Place`;

    default:
      return `${position}th Place`;
  }
};

const formatDate = (date?: string | null) => {
  if (!date) return "";

  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
};

export const generateCertificatePDF = async (
  data: CertificateData
): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      /*
       * Landscape A4
       * 842 x 595 points
       */
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margin: 0,
      });

      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => {
        chunks.push(chunk);
      });

      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on("error", reject);

      const width = 842;
      const height = 595;

      /*
       * Background
       */
      doc
        .rect(0, 0, width, height)
        .fill("#ffffff");

      /*
       * Outer border
       */
      doc
        .lineWidth(2)
        .strokeColor("#111111")
        .rect(25, 25, width - 50, height - 50)
        .stroke();

      /*
       * Inner border
       */
      doc
        .lineWidth(0.7)
        .strokeColor("#777777")
        .rect(35, 35, width - 70, height - 70)
        .stroke();

      /*
       * Top brand
       */
      doc
        .font("Helvetica-Bold")
        .fontSize(15)
        .fillColor("#111111")
        .text(
          "PEDAGOGY",
          0,
          70,
          {
            align: "center",
            width,
          }
        );

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#666666")
        .text(
          "TECHNICAL EVENT MANAGEMENT SYSTEM",
          0,
          91,
          {
            align: "center",
            width,
            characterSpacing: 2,
          }
        );

      /*
       * Certificate heading
       */
      doc
        .font("Helvetica-Bold")
        .fontSize(34)
        .fillColor("#111111")
        .text(
          "CERTIFICATE",
          0,
          135,
          {
            align: "center",
            width,
          }
        );

      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#666666")
        .text(
          "OF " +
            (data.certificateType === "winner"
              ? "ACHIEVEMENT"
              : "PARTICIPATION"),
          0,
          180,
          {
            align: "center",
            width,
            characterSpacing: 2,
          }
        );

      /*
       * Presentation text
       */
      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#555555")
        .text(
          "This certificate is proudly presented to",
          0,
          225,
          {
            align: "center",
            width,
          }
        );

      /*
       * Student name
       */
      doc
        .font("Helvetica-Bold")
        .fontSize(30)
        .fillColor("#111111")
        .text(
          data.studentName,
          90,
          255,
          {
            align: "center",
            width: width - 180,
          }
        );

      /*
       * Underline
       */
      doc
        .lineWidth(1)
        .strokeColor("#222222")
        .moveTo(220, 300)
        .lineTo(622, 300)
        .stroke();

      /*
       * Team line
       *
       * Sits in the existing gap between the underline at y=300 and
       * the achievement text at y=325, so no other coordinate on the
       * certificate has to move and individual certificates render
       * byte-for-byte as they did before.
       */
      if (data.teamName) {
        doc
          .font("Helvetica-Oblique")
          .fontSize(11)
          .fillColor("#555555")
          .text(
            `Team ${data.teamName}`,
            90,
            305,
            {
              align: "center",
              width: width - 180,
            }
          );
      }

      /*
       * Achievement text
       */
      if (data.certificateType === "winner") {
        doc
          .font("Helvetica")
          .fontSize(12)
          .fillColor("#555555")
          .text(
            "for achieving",
            0,
            325,
            {
              align: "center",
              width,
            }
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(20)
          .fillColor("#111111")
          .text(
            getPositionText(data.position),
            0,
            348,
            {
              align: "center",
              width,
            }
          );

        doc
          .font("Helvetica")
          .fontSize(11)
          .fillColor("#555555")
          .text(
            `in ${data.eventTitle}`,
            0,
            378,
            {
              align: "center",
              width,
            }
          );
      } else {
        doc
          .font("Helvetica")
          .fontSize(12)
          .fillColor("#555555")
          .text(
            "for successfully participating in",
            0,
            330,
            {
              align: "center",
              width,
            }
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(20)
          .fillColor("#111111")
          .text(
            data.eventTitle,
            70,
            355,
            {
              align: "center",
              width: width - 140,
            }
          );
      }

      /*
       * Event date
       */
      if (data.eventDate) {
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#777777")
          .text(
            formatDate(data.eventDate),
            0,
            410,
            {
              align: "center",
              width,
            }
          );
      }

      /*
       * Department
       */
      if (data.department) {
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#777777")
          .text(
            data.department,
            0,
            428,
            {
              align: "center",
              width,
            }
          );
      }

      /*
       * Certificate ID
       */
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor("#444444")
        .text(
          `Certificate ID: ${data.certificateCode}`,
          55,
          505,
          {
            width: 250,
          }
        );

      /*
       * QR Code
       */
      const verificationUrl =
        `${
          process.env.FRONTEND_URL ||
          "http://localhost:3000"
        }/verify/${data.certificateCode}`;

      const qrDataUrl = await QRCode.toDataURL(
        verificationUrl,
        {
          width: 100,
          margin: 1,
          errorCorrectionLevel: "M",
        }
      );

      const base64Data = qrDataUrl.replace(
        /^data:image\/png;base64,/,
        ""
      );

      const qrBuffer = Buffer.from(
        base64Data,
        "base64"
      );

      doc.image(qrBuffer, 725, 455, {
        width: 70,
        height: 70,
      });

      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor("#777777")
        .text(
          "Scan to verify",
          712,
          530,
          {
            width: 95,
            align: "center",
          }
        );

      /*
       * Bottom signature lines
       */
      doc
        .lineWidth(0.8)
        .strokeColor("#555555")
        .moveTo(105, 500)
        .lineTo(255, 500)
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#666666")
        .text(
          "Event Organizer",
          105,
          507,
          {
            width: 150,
            align: "center",
          }
        );

      doc
        .lineWidth(0.8)
        .strokeColor("#555555")
        .moveTo(300, 500)
        .lineTo(450, 500)
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#666666")
        .text(
          "Authorized Signatory",
          300,
          507,
          {
            width: 150,
            align: "center",
          }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
